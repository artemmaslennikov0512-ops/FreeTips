package com.freetips.app.util

import com.freetips.app.data.ApiClient

/**
 * Единая постраничная подгрузка операций для sync push.
 * Используется из Home/Worker, чтобы не дублировать сетевую логику.
 */
internal object OperationsPagedSync {

    internal data class Stats(
        val pagesFetched: Int,
        val operationsFetched: Int,
    )

    internal fun fetchAndProcess(
        apiKey: String,
        baseUrl: String,
        pageSize: Int = OperationsSync.FULL_HISTORY_LIMIT,
        maxPages: Int = OperationsSync.MAX_PUSH_SYNC_PAGES,
        onPage: (List<ParsedOperation>) -> Unit,
    ): Stats {
        if (apiKey.isBlank() || baseUrl.isBlank() || pageSize <= 0 || maxPages <= 0) {
            return Stats(pagesFetched = 0, operationsFetched = 0)
        }

        var offset = 0
        var pages = 0
        var operations = 0

        while (pages < maxPages) {
            val response = ApiClient(apiKey, baseUrl)
                .getOperations(pageSize, offset)
                .execute()
            if (!response.isSuccessful) break

            val body = response.body?.string().orEmpty()
            if (body.isBlank()) break

            val parsed = OperationsJsonParser.parse(body)
            if (parsed.operations.isEmpty()) break

            onPage(parsed.operations)
            pages += 1
            operations += parsed.operations.size

            if (parsed.operations.size < pageSize) break
            offset += pageSize
        }

        return Stats(pagesFetched = pages, operationsFetched = operations)
    }
}
