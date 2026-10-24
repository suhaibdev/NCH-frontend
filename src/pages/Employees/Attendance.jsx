import React, { useEffect, useState } from "react";
import api from "../../config/axios";

import "./AttendancePage.css";

const getCurrentMonth = () => {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
};

const getToday = () => new Date().toISOString().slice(0, 10);

const AttendancePage = () => {
  const [employees, setEmployees] = useState([]);
  const [monthRecords, setMonthRecords] = useState([]);

  const [month, setMonth] = useState(getCurrentMonth());

  const [attendanceMode, setAttendanceMode] = useState("bulk");

  const [bulkDate, setBulkDate] = useState(getToday());

  const [bulkRows, setBulkRows] = useState([]);

  const [loadingBulk, setLoadingBulk] = useState(true);

  const [savingBulk, setSavingBulk] = useState(false);

  const [employeeId, setEmployeeId] = useState("");

  const [date, setDate] = useState("");

  const [present, setPresent] = useState(true);

  const [workHours, setWorkHours] = useState("");

  const [overtime, setOvertime] = useState("");

  const [advancePayment, setAdvancePayment] = useState("");

  const [notes, setNotes] = useState("");

  const [editRecordId, setEditRecordId] = useState(null);

  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const [loadingRegister, setLoadingRegister] = useState(true);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchMonthAttendance(month);
  }, [month]);

  useEffect(() => {
    fetchBulkAttendance(bulkDate);
  }, [bulkDate]);

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);

      const res = await api.get("/employees");

      const employeeList = Array.isArray(res.data) ? res.data : [];

      setEmployees(employeeList.filter((employee) => employee.isActive));
    } catch (err) {
      console.error("Failed to fetch employees:", err);

      setError(err.response?.data?.message || "Unable to load employees.");
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchMonthAttendance = async (monthStr) => {
    if (!monthStr) {
      return;
    }

    const [year, mon] = monthStr.split("-").map(Number);

    const daysInMonth = new Date(year, mon, 0).getDate();

    const startDate = `${monthStr}-01`;

    const endDate = `${monthStr}-${String(daysInMonth).padStart(2, "0")}`;

    try {
      setLoadingRegister(true);

      const res = await api.get("/attendance/range", {
        params: {
          startDate,
          endDate,
        },
      });

      setMonthRecords(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load month attendance:", err);

      setMonthRecords([]);

      setError(err.response?.data?.message || "Unable to load attendance register.");
    } finally {
      setLoadingRegister(false);
    }
  };

  const fetchBulkAttendance = async (selectedDate) => {
    if (!selectedDate) {
      return;
    }

    try {
      setLoadingBulk(true);

      const res = await api.get("/attendance/bulk", {
        params: { date: selectedDate },
      });
      const activeEmployees = Array.isArray(res.data?.employees) ? res.data.employees : [];
      const records = Array.isArray(res.data?.records) ? res.data.records : [];
      const recordByEmployee = new Map(records.map((record) => [String(record.employee), record]));
      const defaultWorkHours = Number(res.data?.defaultWorkHours);

      setBulkRows(
        activeEmployees.map((employee) => {
          const record = recordByEmployee.get(String(employee._id));
          const present = record ? Number(record.workHours || 0) > 0 : true;

          return {
            employeeId: employee._id,
            employeeName: employee.name,
            selected: true,
            present,
            defaultWorkHours,
            workHours: record ? Number(record.workHours || 0) : defaultWorkHours,
            overtime: record ? Number(record.overtime || 0) : 0,
            advancePayment: record ? Number(record.advancePayment || 0) : 0,
          };
        })
      );
    } catch (err) {
      console.error("Failed to load bulk attendance:", err);
      setBulkRows([]);
      setError(err.response?.data?.message || "Unable to load attendance for this date.");
    } finally {
      setLoadingBulk(false);
    }
  };

  const updateBulkRow = (employeeId, updates) => {
    setBulkRows((rows) =>
      rows.map((row) => (row.employeeId === employeeId ? { ...row, ...updates } : row))
    );
  };

  const handleBulkStatusChange = (employeeId, presentValue) => {
    setBulkRows((rows) =>
      rows.map((row) => {
        if (row.employeeId !== employeeId) {
          return row;
        }

        return presentValue
          ? {
              ...row,
              present: true,
              workHours: row.defaultWorkHours,
              overtime: 0,
            }
          : {
              ...row,
              present: false,
              workHours: 0,
              overtime: 0,
            };
      })
    );
  };

  const handleBulkSave = async () => {
    clearMessages();
    const selectedRows = bulkRows.filter((row) => row.selected);

    if (selectedRows.length === 0) {
      setError("Select at least one employee to save attendance.");
      return;
    }

    try {
      setSavingBulk(true);
      const res = await api.post("/attendance/bulk", {
        date: bulkDate,
        records: selectedRows.map((row) => ({
          employeeId: row.employeeId,
          present: row.present,
          workHours: row.workHours,
          overtime: row.overtime,
          advancePayment: row.advancePayment,
        })),
      });

      setMessage(
        `Attendance saved: ${res.data?.created || 0} created, ${res.data?.updated || 0} updated.`
      );
      await Promise.all([
        fetchBulkAttendance(bulkDate),
        fetchMonthAttendance(bulkDate.slice(0, 7)),
      ]);
    } catch (err) {
      console.error("Error saving bulk attendance:", err);
      setError(err.response?.data?.message || "Unable to save bulk attendance.");
    } finally {
      setSavingBulk(false);
    }
  };

  const resetForm = () => {
    setEditRecordId(null);

    setEmployeeId("");

    setDate("");

    setPresent(true);

    setWorkHours("");

    setOvertime("");

    setAdvancePayment("");

    setNotes("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    clearMessages();

    if (!employeeId) {
      setError("Please select an employee.");
      return;
    }

    if (!date) {
      setError("Please select an attendance date.");
      return;
    }

    const finalWorkHours = present ? (workHours === "" ? 8 : Number(workHours)) : 0;

    const finalOvertime = present ? (overtime === "" ? 0 : Number(overtime)) : 0;

    const finalAdvance = advancePayment === "" ? 0 : Number(advancePayment);

    if (finalWorkHours < 0 || finalWorkHours > 24) {
      setError("Work hours must be between 0 and 24.");
      return;
    }

    if (finalOvertime < 0 || finalOvertime > 24) {
      setError("Overtime must be between 0 and 24 hours.");
      return;
    }

    if (finalAdvance < 0) {
      setError("Advance payment cannot be negative.");
      return;
    }

    try {
      setSaving(true);

      if (editRecordId) {
        await api.put(`/attendance/${editRecordId}`, {
          present,
          workHours: finalWorkHours,
          overtime: finalOvertime,
          advancePayment: finalAdvance,
          notes: notes.trim(),
        });

        setMessage("Attendance updated successfully.");
      } else {
        await api.post("/attendance", {
          employeeId,
          date,
          present,
          workHours: finalWorkHours,
          overtime: finalOvertime,
          advancePayment: finalAdvance,
          notes: notes.trim(),
        });

        setMessage("Attendance marked successfully.");
      }

      await fetchMonthAttendance(month);

      resetForm();
    } catch (err) {
      console.error("Error saving attendance:", err);

      setError(err.response?.data?.message || "Error marking attendance.");
    } finally {
      setSaving(false);
    }
  };

  const handleCellClick = (employee, day, record) => {
    clearMessages();

    const fullDate = `${month}-${String(day).padStart(2, "0")}`;

    if (record) {
      setEditRecordId(record._id);

      setEmployeeId(employee._id);

      setDate(record.date ? new Date(record.date).toISOString().split("T")[0] : fullDate);

      setPresent(Number(record.workHours || 0) > 0);

      setWorkHours(Number(record.workHours || 0) > 0 ? (record.workHours ?? 8) : "");

      setOvertime(record.overtime ?? "");

      setAdvancePayment(record.advancePayment ?? "");

      setNotes(record.notes ?? "");
    } else {
      setEditRecordId(null);

      setEmployeeId(employee._id);

      setDate(fullDate);

      setPresent(true);

      setWorkHours("");

      setOvertime("");

      setAdvancePayment("");

      setNotes("");
    }

    document.getElementById("attendance-form-card")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const [year, mon] = month ? month.split("-").map(Number) : [0, 0];

  const daysInMonth = month ? new Date(year, mon, 0).getDate() : 0;

  const days = Array.from(
    {
      length: daysInMonth,
    },
    (_, index) => index + 1
  );

  const recordMap = {};

  monthRecords.forEach((record) => {
    const id = record.employee?._id;

    if (!id || !record.date) {
      return;
    }

    const day = new Date(record.date).getUTCDate();

    recordMap[`${id}-${day}`] = record;
  });

  return (
    <div className="ep-container attendance-page">
      {/* ============================
          PAGE HEADER
      ============================ */}

      <div className="attendance-page-header">
        <div>
          <h1>Attendance</h1>

          <p>Mark daily attendance and review the monthly employee register.</p>
        </div>

        <div className="attendance-count">
          <span>Active Employees</span>

          <strong>{employees.length}</strong>
        </div>
      </div>

      {/* ============================
          MESSAGES
      ============================ */}

      {message && <div className="attendance-message success">{message}</div>}

      {error && <div className="attendance-message error">{error}</div>}

      {/* ============================
          ATTENDANCE FORM
      ============================ */}

      <div className="attendance-mode-tabs" role="tablist" aria-label="Attendance mode">
        <button
          type="button"
          className={
            attendanceMode === "bulk" ? "attendance-mode-tab active" : "attendance-mode-tab"
          }
          onClick={() => setAttendanceMode("bulk")}
          aria-selected={attendanceMode === "bulk"}
        >
          Bulk Attendance
        </button>
        <button
          type="button"
          className={
            attendanceMode === "single" ? "attendance-mode-tab active" : "attendance-mode-tab"
          }
          onClick={() => setAttendanceMode("single")}
          aria-selected={attendanceMode === "single"}
        >
          Single Attendance
        </button>
      </div>

      {attendanceMode === "bulk" ? (
        <section className="attendance-card bulk-attendance-card" aria-label="Bulk Attendance">
          <div className="attendance-card-header">
            <div>
              <h2>Bulk Attendance</h2>
              <p>Mark attendance for selected active employees.</p>
            </div>
            <div className="bulk-date-field">
              <label htmlFor="bulk-attendance-date">Date</label>
              <input
                id="bulk-attendance-date"
                type="date"
                value={bulkDate}
                onChange={(event) => {
                  clearMessages();
                  setBulkDate(event.target.value);
                }}
                className="ep-input"
                disabled={savingBulk}
              />
            </div>
          </div>

          {loadingBulk ? (
            <div className="attendance-state">Loading employees and attendance...</div>
          ) : bulkRows.length === 0 ? (
            <div className="attendance-state">No active employees found.</div>
          ) : (
            <>
              <label className="bulk-select-all">
                <input
                  type="checkbox"
                  checked={bulkRows.every((row) => row.selected)}
                  onChange={(event) =>
                    setBulkRows((rows) =>
                      rows.map((row) => ({ ...row, selected: event.target.checked }))
                    )
                  }
                  disabled={savingBulk}
                />
                Select All
              </label>

              <div className="bulk-attendance-table-wrap">
                <table className="bulk-attendance-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Status</th>
                      <th>Working Hour</th>
                      <th>Overtime</th>
                      <th>Advance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((row) => (
                      <tr
                        key={row.employeeId}
                        className={
                          !row.selected ? "bulk-attendance-row unselected" : "bulk-attendance-row"
                        }
                      >
                        <td data-label="Employee">
                          <label className="bulk-employee-choice">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={(event) =>
                                updateBulkRow(row.employeeId, { selected: event.target.checked })
                              }
                              disabled={savingBulk}
                              aria-label={`Include ${row.employeeName} in this attendance save`}
                            />
                            <span>{row.employeeName}</span>
                          </label>
                        </td>
                        <td data-label="Status">
                          <select
                            value={row.present ? "present" : "absent"}
                            onChange={(event) =>
                              handleBulkStatusChange(
                                row.employeeId,
                                event.target.value === "present"
                              )
                            }
                            className="ep-input"
                            disabled={savingBulk}
                          >
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                          </select>
                        </td>
                        <td data-label="Working Hour">
                          <input
                            type="number"
                            value={row.workHours}
                            onChange={(event) =>
                              updateBulkRow(row.employeeId, {
                                workHours:
                                  event.target.value === "" ? "" : Number(event.target.value),
                                present: Number(event.target.value) > 0,
                              })
                            }
                            className="ep-input ep-input-no-spinner"
                            min="0"
                            max="24"
                            step="0.5"
                            disabled={savingBulk || !row.present}
                          />
                        </td>
                        <td data-label="Overtime">
                          <input
                            type="number"
                            value={row.overtime}
                            onChange={(event) =>
                              updateBulkRow(row.employeeId, {
                                overtime:
                                  event.target.value === "" ? "" : Number(event.target.value),
                              })
                            }
                            className="ep-input ep-input-no-spinner"
                            min="0"
                            max="24"
                            step="0.5"
                            disabled={savingBulk || !row.present}
                          />
                        </td>
                        <td data-label="Advance">
                          <input
                            type="number"
                            value={row.advancePayment}
                            onChange={(event) =>
                              updateBulkRow(row.employeeId, {
                                advancePayment:
                                  event.target.value === "" ? "" : Number(event.target.value),
                              })
                            }
                            className="ep-input ep-input-no-spinner"
                            min="0"
                            step="1"
                            disabled={savingBulk}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bulk-attendance-actions">
                <button
                  type="button"
                  className="ep-btn ep-btn-primary"
                  onClick={handleBulkSave}
                  disabled={savingBulk}
                >
                  {savingBulk ? "Saving..." : "Save Attendance"}
                </button>
              </div>
            </>
          )}
        </section>
      ) : (
        <div className="attendance-card" id="attendance-form-card">
          <div className="attendance-card-header">
            <div>
              <h2>{editRecordId ? "Edit Attendance" : "Mark Attendance"}</h2>

              <p>
                {editRecordId
                  ? "Update the selected attendance record."
                  : "Enter the employee's daily attendance details."}
              </p>
            </div>

            {editRecordId && <span className="attendance-edit-badge">Editing</span>}
          </div>

          <form className="attendance-form" onSubmit={handleSubmit}>
            <div className="attendance-field">
              <label>
                Employee
                <span>*</span>
              </label>

              <select
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
                className="ep-input"
                disabled={loadingEmployees || saving}
              >
                <option value="">
                  {loadingEmployees ? "Loading employees..." : "Select Employee"}
                </option>

                {employees.map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.name}
                    {employee.workType ? ` (${employee.workType})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="attendance-field">
              <label>
                Date
                <span>*</span>
              </label>

              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="ep-input"
                disabled={saving}
              />
            </div>

            <div className="attendance-field">
              <label>Status</label>

              <select
                value={present ? "true" : "false"}
                onChange={(event) => {
                  const isPresent = event.target.value === "true";

                  setPresent(isPresent);

                  if (!isPresent) {
                    setWorkHours(0);
                  } else if (Number(workHours || 0) === 0) {
                    setWorkHours("");
                  }
                }}
                className="ep-input"
                disabled={saving}
              >
                <option value="true">Present</option>

                <option value="false">Absent</option>
              </select>
            </div>

            <div className="attendance-field">
              <label>Work Hours</label>

              <input
                type="number"
                value={workHours}
                onChange={(event) => {
                  const raw = event.target.value;

                  const hours = raw === "" ? "" : Number(raw);

                  setWorkHours(hours);

                  if (hours !== "") {
                    setPresent(hours > 0);
                  }
                }}
                className="ep-input ep-input-no-spinner"
                min={0}
                max={24}
                step="0.5"
                placeholder={present ? "Default: 8 hours" : "Saved as 0 when absent"}
                disabled={saving}
              />
            </div>

            <div className="attendance-field">
              <label>Overtime</label>

              <input
                type="number"
                value={overtime}
                onChange={(event) => {
                  const raw = event.target.value;

                  setOvertime(raw === "" ? "" : Number(raw));
                }}
                className="ep-input ep-input-no-spinner"
                min={0}
                max={24}
                step="0.5"
                placeholder="Overtime hours"
                disabled={saving}
              />
            </div>

            <div className="attendance-field">
              <label>Advance Payment</label>

              <input
                type="number"
                value={advancePayment}
                onChange={(event) => {
                  const raw = event.target.value;

                  setAdvancePayment(raw === "" ? "" : Number(raw));
                }}
                className="ep-input ep-input-no-spinner"
                min={0}
                step="1"
                placeholder="₹ Advance"
                disabled={saving}
              />
            </div>

            <div className="attendance-field attendance-notes-field">
              <label>Notes</label>

              <input
                type="text"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="ep-input"
                placeholder="Optional notes"
                disabled={saving}
              />
            </div>

            <div className="attendance-form-actions">
              <button type="submit" className="ep-btn ep-btn-primary" disabled={saving}>
                {saving
                  ? editRecordId
                    ? "Updating..."
                    : "Saving..."
                  : editRecordId
                    ? "Update Attendance"
                    : "Mark Attendance"}
              </button>

              {editRecordId && (
                <button
                  type="button"
                  className="ep-btn ep-btn-secondary"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ============================
          REGISTER
      ============================ */}

      <div className="attendance-card attendance-register-card">
        <div className="att-register-header">
          <div className="att-register-heading">
            <h2>Attendance Register</h2>

            <p>Click any date cell to add or edit attendance.</p>
          </div>

          <div className="att-month-control">
            <label htmlFor="attendance-month">Month</label>

            <input
              id="attendance-month"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="ep-input"
            />
          </div>
        </div>

        {/* ============================
            LEGEND
        ============================ */}

        <div className="att-legend">
          <span className="att-legend-item">
            <span className="att-tick">✓</span>
            Present
          </span>

          <span className="att-legend-item">
            <span className="att-cross">✕</span>
            Absent
          </span>

          <span className="att-legend-item">
            <span className="att-none">–</span>
            No Record
          </span>

          <span className="att-legend-item">
            <span className="att-overtime-symbol">+</span>
            Overtime
          </span>

          <span className="att-legend-item">
            <span className="att-advance-symbol">₹</span>
            Advance
          </span>
        </div>

        {loadingRegister ? (
          <div className="attendance-state">Loading attendance register...</div>
        ) : (
          <div className="att-register-wrap">
            <table className="att-register">
              <thead>
                <tr>
                  <th className="att-sticky-col">Employee</th>

                  {days.map((day) => (
                    <th key={day}>{day}</th>
                  ))}

                  <th className="att-total-col">Total</th>
                </tr>
              </thead>

              <tbody>
                {employees.map((employee) => {
                  let presentCount = 0;

                  let totalHours = 0;

                  const cells = days.map((day) => {
                    const record = recordMap[`${employee._id}-${day}`];

                    if (!record) {
                      return (
                        <td
                          key={day}
                          className="att-cell-none"
                          onClick={() => handleCellClick(employee, day, null)}
                          title="No attendance record. Click to mark attendance."
                        >
                          –
                        </td>
                      );
                    }

                    let cellTitle = "";

                    if (record.overtime > 0 || record.advancePayment > 0 || record.notes) {
                      cellTitle =
                        `Overtime: ${record.overtime || 0}h\n` +
                        `Advance: ₹${record.advancePayment || 0}\n` +
                        `Notes: ${record.notes || "N/A"}`;
                    }

                    const recordIsPresent = Number(record.workHours || 0) > 0;

                    if (recordIsPresent) {
                      presentCount += 1;

                      totalHours += Number(record.workHours || 0);

                      return (
                        <td
                          key={day}
                          className="att-cell-present"
                          onClick={() => handleCellClick(employee, day, record)}
                          title={cellTitle || "Present. Click to edit."}
                        >
                          <span className="att-tick">✓</span>

                          <span className="att-hrs">
                            {record.workHours || 0}h
                            {record.overtime > 0 && (
                              <span className="att-overtime-symbol att-indicator">+</span>
                            )}
                            {record.advancePayment > 0 && (
                              <span className="att-advance-symbol att-indicator">₹</span>
                            )}
                          </span>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={day}
                        className="att-cell-absent"
                        onClick={() => handleCellClick(employee, day, record)}
                        title={cellTitle || "Absent. Click to edit."}
                      >
                        {record.advancePayment > 0 && (
                          <span className="att-advance-symbol att-indicator">₹</span>
                        )}
                        <span className="att-cross">✕</span>
                      </td>
                    );
                  });

                  return (
                    <tr key={employee._id}>
                      <td className="att-sticky-col att-emp-name">{employee.name}</td>

                      {cells}

                      <td className="att-total-col">
                        <strong>{presentCount}P</strong>

                        <span>{totalHours}h</span>
                      </td>
                    </tr>
                  );
                })}

                {employees.length === 0 && (
                  <tr>
                    <td colSpan={days.length + 2} className="att-empty-row">
                      No active employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;
