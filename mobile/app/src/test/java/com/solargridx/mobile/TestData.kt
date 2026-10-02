package com.solargridx.mobile

import com.solargridx.mobile.dto.ReservationResponse
import java.util.Locale

/** Builders shared by the local unit tests. */
object TestData {

    /** Formatters read the default locale once; pin it so assertions do not depend on the machine. */
    fun useEnglishLocale() = Locale.setDefault(Locale.US)

    fun reservation(
        id: String = "res-1",
        nic: String = "199812345678",
        status: String = "Pending",
        reservationDate: String = "2026-10-03T00:00:00Z",
        startTime: String = "09:00",
        endTime: String = "10:00",
        energyKwh: Double = 12.5,
        stationName: String = "Negombo Solar Hub",
        approvedBy: String? = null,
        createdAt: String = "2026-10-01T08:14:22Z"
    ) = ReservationResponse(
        id = id,
        nic = nic,
        stationId = "station-1",
        stationName = stationName,
        slotId = "slot-1",
        reservationDate = reservationDate,
        startTime = startTime,
        endTime = endTime,
        slotTime = "$reservationDate $startTime-$endTime",
        energyKwh = energyKwh,
        status = status,
        qrEligible = status == "Approved",
        approvedBy = approvedBy,
        rejectionReason = null,
        completedAt = null,
        createdAt = createdAt,
        updatedAt = createdAt
    )
}
