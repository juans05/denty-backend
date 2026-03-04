-- ============================================================
-- DoctorSchedule: horario semanal por médico y sede
-- BlockedSlot:    bloqueos de horario (vacaciones, etc.)
-- ============================================================

-- DoctorSchedule
CREATE TABLE "dbDental"."DoctorSchedule" (
    "id"        SERIAL PRIMARY KEY,
    "doctorId"  INTEGER NOT NULL,
    "branchId"  INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,          -- 0=Dom, 1=Lun … 6=Sáb
    "startTime" TEXT NOT NULL DEFAULT '08:00',
    "endTime"   TEXT NOT NULL DEFAULT '18:00',
    "active"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DoctorSchedule_doctorId_fkey"
        FOREIGN KEY ("doctorId") REFERENCES "dbDental"."User"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DoctorSchedule_branchId_fkey"
        FOREIGN KEY ("branchId") REFERENCES "dbDental"."Branch"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DoctorSchedule_doctorId_branchId_dayOfWeek_key"
        UNIQUE ("doctorId", "branchId", "dayOfWeek")
);

-- BlockedSlot
CREATE TABLE "dbDental"."BlockedSlot" (
    "id"        SERIAL PRIMARY KEY,
    "doctorId"  INTEGER,                   -- NULL = bloqueo toda la sede
    "branchId"  INTEGER NOT NULL,
    "startAt"   TIMESTAMP(3) NOT NULL,
    "endAt"     TIMESTAMP(3) NOT NULL,
    "reason"    TEXT,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlockedSlot_doctorId_fkey"
        FOREIGN KEY ("doctorId") REFERENCES "dbDental"."User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BlockedSlot_branchId_fkey"
        FOREIGN KEY ("branchId") REFERENCES "dbDental"."Branch"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BlockedSlot_createdBy_fkey"
        FOREIGN KEY ("createdBy") REFERENCES "dbDental"."User"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);
