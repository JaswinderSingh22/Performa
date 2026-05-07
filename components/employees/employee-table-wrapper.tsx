"use client";

import * as React from "react";

import { AnimatedEmployeesTable, type EmployeeListRow } from "./animated-employees-table";
import { InlineEditEmployeeDialog } from "./inline-edit-employee-dialog";

export function EmployeeTableWrapper({
  employees,
  lockedEmployeeIds,
  currentUserRole,
  teams,
  departments,
}: {
  employees: EmployeeListRow[];
  lockedEmployeeIds?: string[];
  currentUserRole?: string | null;
  teams: { id: string; name: string }[];
  departments: { id: string; name: string }[];
}) {
  const [editEmployee, setEditEmployee] = React.useState<EmployeeListRow | null>(null);

  return (
    <>
      <AnimatedEmployeesTable
        employees={employees}
        lockedEmployeeIds={lockedEmployeeIds}
        currentUserRole={currentUserRole}
        onEditEmployee={setEditEmployee}
      />

      {editEmployee && (
        <InlineEditEmployeeDialog
          employee={editEmployee}
          teams={teams}
          departments={departments}
          accessRole={editEmployee.access_role ?? null}
          accessInvitedAt={editEmployee.access_invited_at ?? null}
          currentUserRole={currentUserRole}
          open={!!editEmployee}
          onClose={() => setEditEmployee(null)}
        />
      )}
    </>
  );
}
