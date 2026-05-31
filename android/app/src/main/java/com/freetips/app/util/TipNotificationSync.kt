package com.freetips.app.util

import android.content.Context
import android.content.Intent

/**
 * Синхронизация пушей по полной истории: одна отметка на tip-id, один пуш.
 * Все вызовы из UI/Worker идут через [OperationsSyncCoordinator].
 */
internal object TipNotificationSync {
    internal data class Tip(
        val id: String,
        val amountKop: Int,
        val feeKop: Int = 0,
        val tipNetKop: Int? = null,
        val createdAtMillis: Long,
    )

    private val lock = Any()

    internal fun syncFromParsedOperations(context: Context, operations: List<ParsedOperation>) {
        if (operations.isEmpty()) return
        val tips = operations.mapNotNull { it.toTip() }
        if (tips.isEmpty()) return
        syncTips(context, tips)
    }

    private fun ParsedOperation.toTip(): Tip? {
        if (type != "tip" || status != "SUCCESS" || id.isBlank() || amountKop <= 0L) return null
        return Tip(
            id = id,
            amountKop = amountKop.coerceAtMost(Int.MAX_VALUE.toLong()).toInt(),
            feeKop = feeKop.coerceAtMost(Int.MAX_VALUE.toLong()).toInt(),
            tipNetKop = tipNetKop?.coerceAtMost(Int.MAX_VALUE.toLong())?.toInt(),
            createdAtMillis = MoscowDateTime.parseCreatedAtMillis(createdAt),
        )
    }

    internal fun syncTips(context: Context, tips: List<Tip>) {
        val appCtx = context.applicationContext
        synchronized(lock) {
            val markStore = TipPushMarkStore.load(appCtx)
            val normalized = tips
                .asSequence()
                .filter { it.id.isNotBlank() && it.amountKop > 0 }
                .distinctBy { it.id }
                .sortedBy { it.createdAtMillis }
                .toList()
            PushSyncMetrics.addFetched(appCtx, normalized.size)
            if (!TipPushMarkStore.isBootstrapDone(appCtx)) TipPushMarkStore.setBootstrapDone(appCtx)

            for (tip in normalized) {
                if (markStore.isDelivered(tip.id)) {
                    PushSyncMetrics.incSkippedDelivered(appCtx)
                    continue
                }
                val displayKop = displayKopForPush(tip)
                if (displayKop <= 0) {
                    markStore.markDelivered(tip.id)
                    PushSyncMetrics.incDelivered(appCtx)
                    continue
                }
                val alreadyPending = markStore.isPending(tip.id)
                if (!alreadyPending && !markStore.markPending(tip.id)) continue
                if (alreadyPending) PushSyncMetrics.incRetryFromPending(appCtx)
                else PushSyncMetrics.incPendingCreated(appCtx)

                // Global server-side dedupe: if already claimed by any device, skip local delivery.
                when (ServerPushClaimApi.claim(appCtx, tip.id)) {
                    ServerPushClaimApi.ClaimResult.CLAIMED -> {
                        // continue to local push delivery
                    }
                    ServerPushClaimApi.ClaimResult.ALREADY_CLAIMED -> {
                        PushSyncMetrics.incServerClaimConflict(appCtx)
                        markStore.markDelivered(tip.id)
                        continue
                    }
                    ServerPushClaimApi.ClaimResult.UNAVAILABLE -> {
                        // Backward compatibility while backend endpoint is not deployed yet.
                    }
                    ServerPushClaimApi.ClaimResult.ERROR -> {
                        PushSyncMetrics.incServerClaimError(appCtx)
                        continue
                    }
                }

                val rubText = formatKopToRub(displayKop)
                val text = appCtx.getString(
                    com.freetips.app.R.string.notification_topup_body,
                    rubText,
                )
                BalanceNotificationHelper.recordDeliveredTip(
                    appCtx,
                    tipId = tip.id,
                    amountKop = displayKop,
                    text = text,
                    timeMillis = tip.createdAtMillis,
                )
                BalanceNotificationHelper.showSystemPush(
                    appCtx,
                    title = appCtx.getString(com.freetips.app.R.string.notification_topup_title),
                    text = text,
                    tipId = tip.id,
                )
                markStore.markDelivered(tip.id)
                PushSyncMetrics.incDelivered(appCtx)
                appCtx.sendBroadcast(
                    Intent(BalanceNotificationHelper.ACTION_TIP_NOTIFICATION_DELIVERED)
                        .setPackage(appCtx.packageName),
                )
            }
        }
    }

    private fun displayKopForPush(tip: Tip): Int {
        val fee = tip.feeKop.coerceAtLeast(0)
        val net = tip.tipNetKop ?: (tip.amountKop - fee).coerceAtLeast(0)
        val gross = maxOf(tip.amountKop, net + fee)
        if (gross <= 0) return 0
        return kotlin.math.round(gross / 100.0).toInt().coerceAtLeast(1) * 100
    }
}
