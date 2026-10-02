package com.solargridx.mobile.identity

/**
 * Checks on a picked profile photo before uploading. The API checks the file's own
 * bytes again; this only avoids sending something it will refuse.
 */
object AvatarPhoto {
    const val MAX_BYTES = 1024 * 1024
    private val ALLOWED = setOf("image/jpeg", "image/png")

    enum class Problem { TOO_LARGE, WRONG_TYPE, EMPTY }

    fun problem(mimeType: String?, size: Long): Problem? = when {
        mimeType !in ALLOWED -> Problem.WRONG_TYPE
        size <= 0 -> Problem.EMPTY
        size > MAX_BYTES -> Problem.TOO_LARGE
        else -> null
    }

    fun fileName(mimeType: String): String = if (mimeType == "image/png") "avatar.png" else "avatar.jpg"
}
