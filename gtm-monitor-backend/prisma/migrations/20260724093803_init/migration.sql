-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "wok" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    CONSTRAINT "Project_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Odp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "odp" TEXT NOT NULL,
    "avai" INTEGER NOT NULL,
    "used" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "lat" REAL,
    "lon" REAL,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "Odp_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'belum',
    "photoUrl" TEXT,
    "planDate" DATETIME,
    "actualDate" DATETIME,
    "odpId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Activity_odpId_fkey" FOREIGN KEY ("odpId") REFERENCES "Odp" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_name_key" ON "Branch"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Odp_odp_key" ON "Odp"("odp");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_odpId_type_key" ON "Activity"("odpId", "type");
