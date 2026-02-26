import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminTable from "../components/AdminTable";
import DetailTabs from "../components/DetailTabs";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import TablePagination from "../components/TablePagination";
import { requirementTypes } from "../data/seedData";
import { exportRowsToCsv, paginateRows, rowMatchesSearch } from "../utils/tableHelpers";
import { createStudent, deleteStudent, listStudents } from "../../../api/adminRecords";
import useNotifications from "../../../components/notifications/useNotifications";

const studentTabs = [
  { id: "overview", label: "Overview" },
  { id: "personal", label: "Personal Info" },
  { id: "guardian", label: "Guardian & Emergency" },
  { id: "enrollment", label: "Enrollment History" },
  { id: "requirements", label: "Requirements" },
  { id: "notes", label: "Notes" },
  { id: "activity", label: "Activity Log" },
];

const requiredTypes = requirementTypes.filter((type) => type.isRequired);

const editableStatusOptions = ["Active", "Inactive", "Graduated", "Pending", "Transferred"];
const enrollmentStatusOptions = [
  "Pending",
  "Enrolled",
  "Completed",
  "Graduated",
  "Withdrawn",
  "Inactive",
];

const normalizeCsvHeader = (value) => {
  const key = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
  if (!key) return "";
  const headerMap = {
    "student id": "studentId",
    studentid: "studentId",
    "full name": "fullName",
    fullname: "fullName",
    grade: "grade",
    section: "section",
    status: "status",
    requirements: "requirementLabel",
    "requirement label": "requirementLabel",
    "last updated": "updatedAt",
    "updated at": "updatedAt",
  };
  return headerMap[key] || key.replace(/\s+/g, "");
};

const parseCsvLine = (line) => {
  const values = [];
  let buffer = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          buffer += '"';
          i += 1;
          continue;
        }
        inQuotes = false;
        continue;
      }
      buffer += char;
      continue;
    }
    if (char === ',') {
      values.push(buffer);
      buffer = "";
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    buffer += char;
  }

  values.push(buffer);
  return values;
};

const parseCsvRecords = (text) => {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const headerLineIndex = lines.findIndex((line) => line.trim());
  if (headerLineIndex === -1) return [];

  const headers = parseCsvLine(lines[headerLineIndex]);
  const records = [];

  for (let i = headerLineIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cells = parseCsvLine(line);
    const record = {};
    headers.forEach((header, index) => {
      const key = normalizeCsvHeader(header);
      if (!key) return;
      record[key] = cells[index] ?? "";
    });
    if (Object.keys(record).length) {
      records.push(record);
    }
  }

  return records;
};

const parseIsoDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const splitFullName = (value) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return { firstName: "", middleName: "", lastName: "" };
  }
  if (normalized.includes(",")) {
    const [last, rest] = normalized.split(",", 2);
    const parts = rest.trim().split(/\s+/).filter(Boolean);
    const firstName = parts.shift() || "";
    const middleName = parts.join(" ");
    return { firstName, middleName, lastName: last.trim() };
  }
  const parts = normalized.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "";
  const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
  const middleName = parts.length > 2 ? parts.slice(1, -1).join(" ") : "";
  return { firstName, middleName, lastName };
};

const buildImportedStudent = (row, studentCode, blankStudent) => {
  const { firstName, middleName, lastName } = splitFullName(
    row.fullName || blankStudent.fullName
  );
  const normalizedName = (row.fullName || blankStudent.fullName || "").trim();
  const nowIso = new Date().toISOString();
  return {
    ...blankStudent,
    id: studentCode,
    studentCode,
    fullName: normalizedName || blankStudent.fullName,
    firstName: firstName || blankStudent.firstName,
    middleName: middleName || blankStudent.middleName,
    lastName: lastName || blankStudent.lastName,
    status: row.status || blankStudent.status,
    currentEnrollment: {
      ...blankStudent.currentEnrollment,
      gradeLevel: row.grade || blankStudent.currentEnrollment.gradeLevel,
      section: row.section || blankStudent.currentEnrollment.section,
    },
    updatedAt: parseIsoDate(row.updatedAt) || blankStudent.updatedAt,
    notes: [
      {
        id: `NOTE-${studentCode}-import`,
        note: "Imported from CSV.",
        createdAt: nowIso,
        createdBy: "Admin",
      },
      ...(blankStudent.notes || []),
    ],
    activityLog: [
      {
        id: `ACT-${studentCode}-import`,
        action: "import",
        details: "Student record imported from CSV.",
        createdAt: nowIso,
        actor: "Admin",
      },
      ...(blankStudent.activityLog || []),
    ],
  };
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeName = (student) => student.fullName || student.name || "Unknown Student";
const getStudentId = (student) => student.studentCode || student.id;
const getGrade = (student) => student.currentEnrollment?.gradeLevel || "Not Set";
const getSection = (student) => student.currentEnrollment?.section || "Not Set";

const getRequirement = (student, typeId) =>
  (student.requirements || []).find((item) => item.requirementTypeId === typeId) || {
    requirementTypeId: typeId,
    status: "Pending",
    verifiedAt: null,
    notes: "",
    documents: [],
  };

const getMissingCount = (student) =>
  requiredTypes.reduce((count, type) => {
    const requirement = getRequirement(student, type.id);
    return requirement.status === "Verified" ? count : count + 1;
  }, 0);

const getPrimaryGuardian = (student) =>
  (student.guardians || []).find((guardian) => guardian.isPrimary) || student.guardians?.[0] || null;

const getRows = (students) =>
  students.map((student) => {
    const missingRequirements = getMissingCount(student);
    return {
      rowId: getStudentId(student),
      student,
      studentId: getStudentId(student),
      fullName: normalizeName(student),
      grade: getGrade(student),
      section: getSection(student),
      gradeSection: `${getGrade(student)} - ${getSection(student)}`,
      status: student.status || "Active",
      missingRequirements,
      requirementLabel: missingRequirements === 0 ? "Complete" : `Missing ${missingRequirements}`,
      updatedAt: student.updatedAt || student.createdAt || null,
    };
  });

const nextStudentId = (students) => {
  const maxCode = students.reduce((max, student) => {
    const parsed = Number.parseInt(String(getStudentId(student)).replace(/\D/g, ""), 10);
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
  }, 2100);

  return `STD-${maxCode + 1}`;
};

const createBlankStudent = (students) => {
  const studentCode = nextStudentId(students);
  const now = new Date().toISOString();
  return {
    id: studentCode,
    studentCode,
    firstName: "New",
    middleName: "",
    lastName: "Student",
    suffix: "",
    fullName: `New Student ${studentCode.replace("STD-", "")}`,
    birthdate: "",
    sex: "",
    address: "",
    phone: "",
    email: "",
    photoUrl: "",
    status: "Active",
    createdAt: now,
    updatedAt: now,
    guardianContact: "",
    currentEnrollment: {
      academicYear: "2025-2026",
      gradeLevel: "Not Set",
      section: "Not Set",
      enrollmentStatus: "Pending",
      enrolledAt: "",
      remarks: "Record created from dashboard",
    },
    guardians: [],
    emergencyContact: {
      fullName: "",
      relationship: "",
      phone: "",
      email: "",
    },
    enrollmentHistory: [],
    requirements: requiredTypes.map((type) => ({
      requirementTypeId: type.id,
      status: "Pending",
      verifiedAt: null,
      notes: "",
      documents: [],
    })),
    notes: [
      {
        id: `NOTE-${studentCode}-1`,
        note: "Record created from Students page.",
        createdAt: now,
        createdBy: "Admin",
      },
    ],
    activityLog: [
      {
        id: `ACT-${studentCode}-1`,
        action: "create",
        details: "Student record created.",
        createdAt: now,
        actor: "Admin",
      },
    ],
  };
};

const blankGuardianForm = {
  fullName: "",
  relationship: "",
  phone: "",
  email: "",
  address: "",
  isPrimary: false,
};

const buildGuardianContactLabel = (guardians = []) => {
  if (!guardians.length) return "";
  const primary = guardians.find((guardian) => guardian.isPrimary) || guardians[0];
  const name = primary.fullName || "Guardian";
  const phone = primary.phone || "No phone";
  return `${name} - ${phone}`;
};

const normalizeBackendStudent = (student) => {
  if (!student) return null;
  const studentCode = student.studentCode || student.studentId || student.id || student._id || "";
  const createdAt = student.createdAt || student.enrollmentDate || null;
  const updatedAt = student.updatedAt || createdAt;
  const enrollment = {
    academicYear: student.academicYear || "2025-2026",
    gradeLevel: student.gradeYear || student.currentEnrollment?.gradeLevel || "Not Set",
    section: student.sectionClass || student.currentEnrollment?.section || "Not Set",
    enrollmentStatus:
      student.enrollmentStatus || student.currentEnrollment?.enrollmentStatus || "Enrolled",
    enrolledAt:
      student.enrollmentDate || student.currentEnrollment?.enrolledAt || createdAt || "",
    remarks: student.currentEnrollment?.remarks || "",
  };

  return {
    id: student._id || student.id || studentCode,
    studentCode,
    fullName: student.fullName || `Student ${studentCode || "Untitled"}`,
    firstName: student.firstName || "",
    middleName: student.middleName || "",
    lastName: student.lastName || "",
    birthdate: student.birthdate || "",
    sex: student.sex || "",
    address: student.address || "",
    phone: student.phone || "",
    email: student.email || "",
    photoUrl: student.photoUrl || "",
    guardianContact: student.guardianContact || "",
    status: student.status || "Active",
    createdAt,
    updatedAt,
    currentEnrollment: enrollment,
    guardians: student.guardians || [],
    emergencyContact: student.emergencyContact || {},
    enrollmentHistory: student.enrollmentHistory || [],
    requirements: student.requirements || [],
    notes: student.notes || [],
    activityLog: student.activityLog || [],
  };
};

export default function StudentsPage() {
  const { confirm, showAlert, showToast } = useNotifications();
  const [students, setStudents] = useState([]);
  const [view, setView] = useState("table");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [missingOnly, setMissingOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const fileInputRef = useRef(null);
  const [importStatus, setImportStatus] = useState("");
  const [addStatus, setAddStatus] = useState("");
  const [addError, setAddError] = useState("");
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const addStudentLockRef = useRef(false);
  const [isFetchingStudents, setIsFetchingStudents] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [personalEditSnapshot, setPersonalEditSnapshot] = useState(null);
  const [isEditingGuardian, setIsEditingGuardian] = useState(false);
  const [guardianForm, setGuardianForm] = useState(blankGuardianForm);
  const [editingGuardianIndex, setEditingGuardianIndex] = useState(null);
  const [guardianMessage, setGuardianMessage] = useState("");
  const requirementFileInputRef = useRef(null);
  const [requirementUploadMessage, setRequirementUploadMessage] = useState("");
  const [activeRequirementUploadId, setActiveRequirementUploadId] = useState(null);
  const [deletingStudentBackendId, setDeletingStudentBackendId] = useState(null);

  const isObjectId = (value) => /^[a-f0-9]{24}$/i.test(String(value || ""));

  const fetchStudents = useCallback(async () => {
    setFetchError("");
    setIsFetchingStudents(true);

    try {
      const response = await listStudents({ limit: 200 });
      const items = Array.isArray(response?.items) ? response.items : [];
      const normalized = items.map(normalizeBackendStudent).filter(Boolean);

      if (normalized.length) {
        setStudents(normalized);
        setSelectedStudentId((currentId) => {
          const hasCurrent = normalized.some((student) => getStudentId(student) === currentId);
          return hasCurrent ? currentId : getStudentId(normalized[0]);
        });
      } else if (items.length === 0) {
        setStudents([]);
      }
    } catch (error) {
      console.error("List students error:", error);
      setFetchError(error?.message || "Unable to load students.");
    } finally {
      setIsFetchingStudents(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    if (view !== "profile") {
      setIsEditingPersonal(false);
      setPersonalEditSnapshot(null);
      setIsEditingGuardian(false);
    }
  }, [view]);

  useEffect(() => {
    if (activeTab !== "guardian") {
      setIsEditingGuardian(false);
    }
  }, [activeTab]);

  const rows = useMemo(() => getRows(students), [students]);

  const filteredRows = useMemo(() => {
    return rows
      .filter((row) => rowMatchesSearch(row, ["studentId", "fullName"], searchTerm))
      .filter((row) => (gradeFilter === "all" ? true : row.grade === gradeFilter))
      .filter((row) => (sectionFilter === "all" ? true : row.section === sectionFilter))
      .filter((row) => (statusFilter === "all" ? true : row.status === statusFilter))
      .filter((row) => (missingOnly ? row.missingRequirements > 0 : true));
  }, [rows, searchTerm, gradeFilter, sectionFilter, statusFilter, missingOnly]);

  const gradeOptions = useMemo(
    () => [...new Set(rows.map((row) => row.grade).filter(Boolean))],
    [rows]
  );
  const sectionOptions = useMemo(
    () => [...new Set(rows.map((row) => row.section).filter(Boolean))],
    [rows]
  );
  const statusOptions = useMemo(
    () => [...new Set(rows.map((row) => row.status).filter(Boolean))],
    [rows]
  );

  const { pageRows, totalPages, currentPage } = paginateRows(filteredRows, page, pageSize);

  const selectedStudent = useMemo(
    () => students.find((student) => getStudentId(student) === selectedStudentId) || null,
    [students, selectedStudentId]
  );
  const currentStudentId = selectedStudent ? getStudentId(selectedStudent) : null;

  useEffect(() => {
    setGuardianForm(blankGuardianForm);
    setEditingGuardianIndex(null);
    setGuardianMessage("");
    setRequirementUploadMessage("");
    setActiveRequirementUploadId(null);
  }, [currentStudentId]);

  const handleStudentUpdate = (studentId, patch) => {
    setStudents((currentStudents) =>
      currentStudents.map((student) => {
        if (getStudentId(student) !== studentId) return student;
        const updated = {
          ...student,
          ...patch,
          updatedAt: new Date().toISOString(),
        };

        if ("firstName" in patch || "middleName" in patch || "lastName" in patch) {
          const firstName = patch.firstName ?? updated.firstName;
          const middleName = patch.middleName ?? updated.middleName;
          const lastName = patch.lastName ?? updated.lastName;
          const parts = [firstName, middleName, lastName].filter(Boolean);
          updated.fullName = parts.join(" ") || updated.fullName;
        }

        return updated;
      })
    );
  };

  const resetGuardianForm = () => {
    setGuardianForm(blankGuardianForm);
    setEditingGuardianIndex(null);
    setGuardianMessage("");
  };

  const handleGuardianFormChange = (field, value) => {
    setGuardianForm((current) => ({ ...current, [field]: value }));
  };

  const handleGuardianSave = () => {
    if (!selectedStudent || !currentStudentId) return;
    if (!guardianForm.fullName.trim()) {
      setGuardianMessage("Please enter guardian name.");
      return;
    }

    const nextGuardians = (selectedStudent.guardians || []).map((guardian) => ({
      ...guardian,
    }));

    const normalized = {
      fullName: guardianForm.fullName.trim(),
      relationship: guardianForm.relationship.trim(),
      phone: guardianForm.phone.trim(),
      email: guardianForm.email.trim(),
      address: guardianForm.address.trim(),
      isPrimary: Boolean(guardianForm.isPrimary),
    };

    if (normalized.isPrimary) {
      nextGuardians.forEach((guardian) => {
        guardian.isPrimary = false;
      });
    }

    if (editingGuardianIndex !== null && nextGuardians[editingGuardianIndex]) {
      nextGuardians[editingGuardianIndex] = normalized;
    } else {
      nextGuardians.push(normalized);
    }

    if (!nextGuardians.some((guardian) => guardian.isPrimary) && nextGuardians.length) {
      nextGuardians[0].isPrimary = true;
    }

    handleStudentUpdate(currentStudentId, {
      guardians: nextGuardians,
      guardianContact: buildGuardianContactLabel(nextGuardians),
    });

    setGuardianMessage("Guardian saved.");
    resetGuardianForm();
  };

  const handleEditGuardian = (index) => {
    if (!selectedStudent) return;
    const guardian = (selectedStudent.guardians || [])[index];
    if (!guardian) return;
    setGuardianForm({ ...guardian });
    setEditingGuardianIndex(index);
    setGuardianMessage("");
  };

  const handleSetPrimaryGuardian = (index) => {
    if (!selectedStudent || !currentStudentId) return;
    const nextGuardians = (selectedStudent.guardians || []).map((guardian, guardianIndex) => ({
      ...guardian,
      isPrimary: guardianIndex === index,
    }));
    handleStudentUpdate(currentStudentId, {
      guardians: nextGuardians,
      guardianContact: buildGuardianContactLabel(nextGuardians),
    });
  };

  const handleEmergencyFieldChange = (field, value) => {
    if (!currentStudentId || !selectedStudent) return;
    const nextEmergency = { ...(selectedStudent.emergencyContact || {}) };
    nextEmergency[field] = value;
    handleStudentUpdate(currentStudentId, {
      emergencyContact: nextEmergency,
    });
  };

  const handleRequirementUploadClick = (typeId) => {
    setActiveRequirementUploadId(typeId);
    setRequirementUploadMessage("");
    requirementFileInputRef.current?.click();
  };

  const handleRequirementFileChange = (event) => {
    const file = event.target?.files?.[0];
    if (!file || !selectedStudent || !currentStudentId || !activeRequirementUploadId) {
      if (event.target) {
        event.target.value = "";
      }
      setActiveRequirementUploadId(null);
      return;
    }

    const typeMeta = requiredTypes.find((type) => type.id === activeRequirementUploadId);
    const now = new Date().toISOString();
    const documentEntry = {
      id: `DOC-${currentStudentId}-${activeRequirementUploadId}-${Date.now()}`,
      fileName: file.name,
      fileType: file.type,
      uploadedAt: now,
    };

    const nextRequirements = requiredTypes.map((type) => {
      const existing = (selectedStudent.requirements || []).find(
        (requirement) => requirement.requirementTypeId === type.id
      );
      if (type.id !== activeRequirementUploadId) {
        return existing
          ? { ...existing, documents: [...(existing.documents || [])] }
          : {
              requirementTypeId: type.id,
              status: "Pending",
              verifiedAt: null,
              notes: "",
              documents: [],
            };
      }

      const documents = [...(existing?.documents || []), documentEntry];
      const status = existing?.status === "Verified" ? "Verified" : "Submitted";
      return {
        requirementTypeId: type.id,
        status,
        verifiedAt: existing?.verifiedAt || null,
        notes: existing?.notes || "",
        documents,
      };
    });

    const activityEntry = {
      id: `ACT-${currentStudentId}-${Date.now()}`,
      action: "upload",
      details: `Uploaded ${file.name} for ${typeMeta?.name || "requirement"}`,
      createdAt: now,
      actor: "Admin",
    };

    handleStudentUpdate(currentStudentId, {
      requirements: nextRequirements,
      activityLog: [...(selectedStudent.activityLog || []), activityEntry],
    });

    setRequirementUploadMessage(`Uploaded ${file.name}`);
    setActiveRequirementUploadId(null);
    if (event.target) {
      event.target.value = "";
    }
  };

  const handlePersonalFieldChange = (field, value) => {
    if (!currentStudentId) return;
    handleStudentUpdate(currentStudentId, { [field]: value });
  };

  const handleEnrollmentChange = (field, value) => {
    if (!currentStudentId) return;
    const enrollment = selectedStudent?.currentEnrollment || {};
    handleStudentUpdate(currentStudentId, {
      currentEnrollment: { ...enrollment, [field]: value },
    });
  };

  const beginPersonalEditForStudent = (student) => {
    if (!student) return;
    setPersonalEditSnapshot(JSON.parse(JSON.stringify(student)));
    setIsEditingPersonal(true);
  };

  const startPersonalEdit = () => {
    if (!selectedStudent) return;
    setActiveTab("personal");
    beginPersonalEditForStudent(selectedStudent);
    setIsEditingGuardian(false);
  };

  const handleStartEdit = () => {
    if (!selectedStudent) return;
    if (activeTab === "guardian") {
      setIsEditingGuardian(true);
      setIsEditingPersonal(false);
      setPersonalEditSnapshot(null);
      setGuardianForm(blankGuardianForm);
      setEditingGuardianIndex(null);
      return;
    }
    startPersonalEdit();
  };

  const handleSavePersonal = () => {
    setIsEditingPersonal(false);
    setPersonalEditSnapshot(null);
  };

  const handleCancelPersonalEdit = () => {
    if (personalEditSnapshot) {
      const snapshotId = getStudentId(personalEditSnapshot);
      const snapshotCopy = JSON.parse(JSON.stringify(personalEditSnapshot));
      setStudents((currentStudents) =>
        currentStudents.map((student) =>
          getStudentId(student) === snapshotId ? snapshotCopy : student
        )
      );
    }
    setIsEditingPersonal(false);
    setPersonalEditSnapshot(null);
  };

  const openStudentProfile = (studentId, tabId = "overview") => {
    setSelectedStudentId(studentId);
    setActiveTab(tabId);
    setView("profile");
    setIsEditingPersonal(false);
    setPersonalEditSnapshot(null);
  };

  const archiveStudent = (studentId) => {
    const now = new Date().toISOString();
    setStudents((currentStudents) =>
      currentStudents.map((student) =>
        getStudentId(student) === studentId
          ? {
              ...student,
              status: "Inactive",
              updatedAt: now,
              activityLog: [
                {
                  id: `ACT-${studentId}-${Date.now()}`,
                  action: "archive",
                  details: "Student archived from Students list.",
                  createdAt: now,
                  actor: "Admin",
                },
                ...(student.activityLog || []),
              ],
            }
          : student
      )
    );
  };

  const handleDeleteStudent = useCallback(
    async (student) => {
      if (!student) return;

      const backendId = student.id;
      if (!isObjectId(backendId)) {
        setStudents((currentStudents) => currentStudents.filter((entry) => entry !== student));
        showToast("Removed unsaved student row.", { type: "success" });
        if (view === "profile" && getStudentId(student) === selectedStudentId) {
          setView("table");
        }
        return;
      }

      if (deletingStudentBackendId === backendId) return;

      const accepted = await confirm(
        `Delete student ${getStudentId(student)}? This cannot be undone.`,
        {
          title: "Delete student",
          confirmLabel: "Delete",
          cancelLabel: "Cancel",
        }
      );

      if (!accepted) return;

      setDeletingStudentBackendId(backendId);
      try {
        await deleteStudent(backendId);
        showToast("Student deleted.", { type: "success" });
        if (view === "profile" && getStudentId(student) === selectedStudentId) {
          setView("table");
        }
        await fetchStudents();
      } catch (error) {
        console.error("Delete student error:", error);
        showAlert(error?.message || "Failed to delete student.", { variant: "danger" });
      } finally {
        setDeletingStudentBackendId(null);
      }
    },
    [
      confirm,
      deletingStudentBackendId,
      fetchStudents,
      selectedStudentId,
      showAlert,
      showToast,
      view,
    ]
  );

  const handleAddStudent = async () => {
    if (addStudentLockRef.current || isAddingStudent) return;
    addStudentLockRef.current = true;
    setIsAddingStudent(true);

    const newStudent = createBlankStudent(students);
    setStudents((currentStudents) => [newStudent, ...currentStudents]);
    setPage(1);
    setAddStatus("Saving new student...");
    setAddError("");
    openStudentProfile(getStudentId(newStudent), "personal");
    beginPersonalEditForStudent(newStudent);

    try {
      const payload = {
        studentCode: newStudent.studentCode,
        fullName: newStudent.fullName,
        gradeYear: newStudent.currentEnrollment.gradeLevel,
        sectionClass: newStudent.currentEnrollment.section,
        status: newStudent.status,
        guardianContact: newStudent.guardianContact,
        enrollmentDate: newStudent.currentEnrollment.enrolledAt || newStudent.createdAt,
      };
      const created = await createStudent(payload);
      const normalized = normalizeBackendStudent(created);
      setStudents((currentStudents) =>
        currentStudents.map((student) =>
          getStudentId(student) === getStudentId(newStudent) ? normalized || student : student
        )
      );
      if (normalized) {
        setSelectedStudentId(getStudentId(normalized));
      }
      setAddStatus("Student saved.");
    } catch (error) {
      console.error("Create student error:", error);
      setAddStatus("Failed to save student.");
      setAddError(error?.message || "Unable to reach the API.");
      setStudents((currentStudents) =>
        currentStudents.filter((student) => student !== newStudent)
      );
      setView("table");
      await fetchStudents();
    } finally {
      setIsAddingStudent(false);
      addStudentLockRef.current = false;
    }
  };

  const handleImport = () => {
    setImportStatus("");
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    setImportStatus("Importing students...");

    try {
      const text = await file.text();
      const records = parseCsvRecords(text);
      if (!records.length) {
        setImportStatus("CSV contained no student rows.");
        return;
      }

      const importedStudents = [];
      setStudents((currentStudents) => {
        let updated = [...currentStudents];
        records.forEach((record) => {
          const blank = createBlankStudent(updated);
          const imported = buildImportedStudent(record, blank.studentCode, blank);
          updated = [...updated, imported];
          importedStudents.push(imported);
        });
        return updated;
      });

      if (importedStudents.length) {
        setImportStatus(`${importedStudents.length} student(s) imported.`);
        setPage(1);
        openStudentProfile(importedStudents[0].studentCode, "personal");
        beginPersonalEditForStudent(importedStudents[0]);
      } else {
        setImportStatus("No students were created from the CSV file.");
      }
    } catch (error) {
      console.error("Import error:", error);
      setImportStatus("Failed to import the CSV file.");
    } finally {
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleExport = () => {
    exportRowsToCsv("student-masterlist.csv", filteredRows, [
      { key: "studentId", label: "Student ID" },
      { key: "fullName", label: "Full Name" },
      { key: "grade", label: "Grade" },
      { key: "section", label: "Section" },
      { key: "status", label: "Status" },
      { key: "requirementLabel", label: "Requirements" },
      { key: "updatedAt", label: "Last Updated" },
    ]);
  };

  return (
    <section className="sa-module">
      {view === "table" ? (
        <>
          <PageHeader
            title="Students"
            subtitle="Manage student records with list-first workflows, requirement visibility, and profile drill-down."
            actions={
              <div className="sa-action-group">
                <button
                  type="button"
                  className="sa-btn sa-btn-primary"
                  onClick={handleAddStudent}
                  disabled={isAddingStudent}
                >
                  {isAddingStudent ? "Saving..." : "+ Add Student"}
                </button>
                <button type="button" className="sa-btn sa-btn-secondary" onClick={handleImport}>
                  Import
                </button>
                <button type="button" className="sa-btn sa-btn-secondary" onClick={handleExport}>
                  Export
                </button>
              </div>
            }
          />

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={handleImportFile}
          />

          <div className="sa-panel sa-stack-gap">
            {importStatus && <div className="smallMuted">{importStatus}</div>}
            {addStatus && <div className="smallMuted">{addStatus}</div>}
            {addError && <div className="sa-error-text">{addError}</div>}
            {isFetchingStudents && <div className="smallMuted">Loading students from backend...</div>}
            {fetchError && <div className="sa-error-text">{fetchError}</div>}
            <div className="sa-toolbar-main">
              <label className="sa-toolbar-search">
                <span className="sa-toolbar-label">Search</span>
                <input
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search name / Student ID"
                />
              </label>

              <label className="sa-toolbar-filter">
                <span className="sa-toolbar-label">Grade</span>
                <select
                  value={gradeFilter}
                  onChange={(event) => {
                    setGradeFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Grades</option>
                  {gradeOptions.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sa-toolbar-filter">
                <span className="sa-toolbar-label">Section</span>
                <select
                  value={sectionFilter}
                  onChange={(event) => {
                    setSectionFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Sections</option>
                  {sectionOptions.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sa-toolbar-filter">
                <span className="sa-toolbar-label">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Status</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sa-toolbar-filter">
                <span className="sa-toolbar-label">Rows</span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                >
                  {[5, 10, 20].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="sa-toggle">
              <input
                type="checkbox"
                checked={missingOnly}
                onChange={() => {
                  setMissingOnly((current) => !current);
                  setPage(1);
                }}
              />
              <span>Missing Docs only</span>
            </label>

            <AdminTable
              columns={[
                "Student ID",
                "Full Name",
                "Grade-Section",
                "Status",
                "Requirements",
                "Last Updated",
                "Actions",
              ]}
              minWidth={1160}
            >
              {pageRows.map((row) => (
                <tr key={row.rowId} className="sa-row-clickable" onClick={() => openStudentProfile(row.studentId)}>
                  <td>{row.studentId}</td>
                  <td>{row.fullName}</td>
                  <td>{row.gradeSection}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>
                    <div className="sa-requirement-badge">
                      <StatusBadge status={row.missingRequirements === 0 ? "Complete" : "Missing"} />
                      <span className="sa-muted-inline">{row.requirementLabel}</span>
                    </div>
                  </td>
                  <td>{formatDate(row.updatedAt)}</td>
                  <td>
                    <div className="sa-action-group">
                      <button
                        type="button"
                        className="sa-btn sa-btn-ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          openStudentProfile(row.studentId, "overview");
                        }}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="sa-btn sa-btn-secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          openStudentProfile(row.studentId, "personal");
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="sa-btn sa-btn-danger"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteStudent(row.student);
                        }}
                        disabled={deletingStudentBackendId === row.student?.id}
                      >
                        {deletingStudentBackendId === row.student?.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </AdminTable>

            <TablePagination
              page={currentPage}
              totalPages={totalPages}
              totalItems={filteredRows.length}
              onPageChange={setPage}
            />
          </div>
        </>
      ) : null}

      {view === "profile" && selectedStudent ? (
        <>
          <PageHeader
            title="Student Profile"
            subtitle="Profile-first view with student details, requirements, notes, and audit history."
            actions={
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setView("table")}>
                Back to Students
              </button>
            }
          />

          <div className="sa-panel sa-profile-header">
            <div className="sa-profile-main">
              <div className="sa-profile-photo" aria-hidden="true">
                {selectedStudent.photoUrl ? (
                  <img src={selectedStudent.photoUrl} alt={normalizeName(selectedStudent)} />
                ) : (
                  <span>{normalizeName(selectedStudent).slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="sa-profile-summary">
                <h2 className="sa-panel-title">{normalizeName(selectedStudent)}</h2>
                <p className="sa-muted-text">Student ID: {getStudentId(selectedStudent)}</p>
                <div className="sa-chip-list">
                  <StatusBadge status={selectedStudent.status || "Active"} />
                  <span className="sa-chip">
                    {getGrade(selectedStudent)} - {getSection(selectedStudent)}
                  </span>
                </div>
                <p className="sa-muted-text">
                  Guardian: {selectedStudent.guardianContact || getPrimaryGuardian(selectedStudent)?.fullName || "-"}
                </p>
              </div>
            </div>

              <div className="sa-action-group">
                <button type="button" className="sa-btn sa-btn-secondary" onClick={handleStartEdit}>
                  Edit
                </button>
              <button
                type="button"
                className="sa-btn sa-btn-secondary"
                onClick={() => setActiveTab("requirements")}
              >
                Upload Document
              </button>
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => window.print()}>
                Print Profile
              </button>
              <button
                type="button"
                className="sa-btn sa-btn-danger"
                onClick={() => handleDeleteStudent(selectedStudent)}
                disabled={deletingStudentBackendId === selectedStudent?.id}
              >
                {deletingStudentBackendId === selectedStudent?.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>

          <div className="sa-panel sa-stack-gap">
            <DetailTabs tabs={studentTabs} activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === "overview" ? (
              <div className="sa-detail-grid">
                <div>
                  <p className="sa-label">Current Enrollment</p>
                  <p className="sa-value">
                    {selectedStudent.currentEnrollment?.academicYear || "-"} / {getGrade(selectedStudent)} - {getSection(selectedStudent)}
                  </p>
                </div>
                <div>
                  <p className="sa-label">Enrollment Status</p>
                  <p className="sa-value">{selectedStudent.currentEnrollment?.enrollmentStatus || "-"}</p>
                </div>
                <div>
                  <p className="sa-label">Requirements Snapshot</p>
                  <p className="sa-value">
                    {getMissingCount(selectedStudent) === 0
                      ? "All required documents complete"
                      : `${getMissingCount(selectedStudent)} requirement(s) missing`}
                  </p>
                </div>
                <div>
                  <p className="sa-label">Last Updated</p>
                  <p className="sa-value">{formatDateTime(selectedStudent.updatedAt || selectedStudent.createdAt)}</p>
                </div>
              </div>
            ) : null}

            {activeTab === "personal" ? (
              <>
                {isEditingPersonal ? (
                  <div className="sa-form-grid">
                    <div className="sa-field">
                      <span>First Name</span>
                      <input
                        value={selectedStudent.firstName || ""}
                        onChange={(event) => handlePersonalFieldChange("firstName", event.target.value)}
                      />
                    </div>
                    <div className="sa-field">
                      <span>Middle Name</span>
                      <input
                        value={selectedStudent.middleName || ""}
                        onChange={(event) => handlePersonalFieldChange("middleName", event.target.value)}
                      />
                    </div>
                    <div className="sa-field">
                      <span>Last Name</span>
                      <input
                        value={selectedStudent.lastName || ""}
                        onChange={(event) => handlePersonalFieldChange("lastName", event.target.value)}
                      />
                    </div>
                    <div className="sa-field">
                      <span>Birthdate</span>
                      <input
                        type="date"
                        value={selectedStudent.birthdate || ""}
                        onChange={(event) => handlePersonalFieldChange("birthdate", event.target.value)}
                      />
                    </div>
                    <div className="sa-field">
                      <span>Address</span>
                      <input
                        value={selectedStudent.address || ""}
                        onChange={(event) => handlePersonalFieldChange("address", event.target.value)}
                      />
                    </div>
                    <div className="sa-field">
                      <span>Phone</span>
                      <input
                        type="tel"
                        value={selectedStudent.phone || ""}
                        onChange={(event) => handlePersonalFieldChange("phone", event.target.value)}
                      />
                    </div>
                    <div className="sa-field">
                      <span>Email</span>
                      <input
                        type="email"
                        value={selectedStudent.email || ""}
                        onChange={(event) => handlePersonalFieldChange("email", event.target.value)}
                      />
                    </div>
                    <div className="sa-field">
                      <span>Sex</span>
                      <select
                        value={selectedStudent.sex || ""}
                        onChange={(event) => handlePersonalFieldChange("sex", event.target.value)}
                      >
                        {["Male", "Female", "Other"].map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sa-field">
                      <span>Status</span>
                      <select
                        value={selectedStudent.status || editableStatusOptions[0]}
                        onChange={(event) => handlePersonalFieldChange("status", event.target.value)}
                      >
                        {editableStatusOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sa-field">
                      <span>Grade Level</span>
                      <input
                        value={selectedStudent.currentEnrollment?.gradeLevel || ""}
                        onChange={(event) => handleEnrollmentChange("gradeLevel", event.target.value)}
                      />
                    </div>
                    <div className="sa-field">
                      <span>Section</span>
                      <input
                        value={selectedStudent.currentEnrollment?.section || ""}
                        onChange={(event) => handleEnrollmentChange("section", event.target.value)}
                      />
                    </div>
                    <div className="sa-field">
                      <span>Enrollment Status</span>
                      <select
                        value={
                          selectedStudent.currentEnrollment?.enrollmentStatus ||
                          enrollmentStatusOptions[0]
                        }
                        onChange={(event) => handleEnrollmentChange("enrollmentStatus", event.target.value)}
                      >
                        {enrollmentStatusOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="sa-detail-grid">
                    <div>
                      <p className="sa-label">Full Name</p>
                      <p className="sa-value">{normalizeName(selectedStudent)}</p>
                    </div>
                    <div>
                      <p className="sa-label">Birthdate</p>
                      <p className="sa-value">{formatDate(selectedStudent.birthdate)}</p>
                    </div>
                    <div>
                      <p className="sa-label">Address</p>
                      <p className="sa-value">{selectedStudent.address || "-"}</p>
                    </div>
                    <div>
                      <p className="sa-label">Contact</p>
                      <p className="sa-value">{selectedStudent.phone || "-"}</p>
                    </div>
                    <div>
                      <p className="sa-label">Email</p>
                      <p className="sa-value">{selectedStudent.email || "-"}</p>
                    </div>
                    <div>
                      <p className="sa-label">Sex</p>
                      <p className="sa-value">{selectedStudent.sex || "-"}</p>
                    </div>
                  </div>
                )}
                <div className="sa-form-actions">
                  {isEditingPersonal ? (
                    <>
                      <button type="button" className="sa-btn sa-btn-primary" onClick={handleSavePersonal}>
                        Save Changes
                      </button>
                      <button type="button" className="sa-btn sa-btn-ghost" onClick={handleCancelPersonalEdit}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <p className="sa-inline-note">Tap Edit to modify student info.</p>
                  )}
                </div>
              </>
            ) : null}

            {activeTab === "guardian" ? (
              <div className="sa-stack-gap">
                <AdminTable
                  columns={[
                    "Guardian Name",
                    "Relationship",
                    "Phone",
                    "Email",
                    "Actions",
                  ]}
                  minWidth={1040}
                  emptyMessage="No guardian records."
                >
                  {(selectedStudent.guardians || []).map((guardian, index) => (
                    <tr key={`${guardian.fullName}-${guardian.relationship}`}>
                      <td>{guardian.fullName || "-"}</td>
                      <td>{guardian.relationship || "-"}</td>
                      <td>{guardian.phone || "-"}</td>
                      <td>{guardian.email || "-"}</td>
                      <td>
                        <div className="sa-action-group">
                          <button
                            type="button"
                            className="sa-btn sa-btn-secondary"
                            onClick={() => handleEditGuardian(index)}
                          >
                            Edit
                          </button>
                          {!guardian.isPrimary && (
                            <button
                              type="button"
                              className="sa-btn sa-btn-ghost"
                              onClick={() => handleSetPrimaryGuardian(index)}
                            >
                              Set Primary
                            </button>
                          )}
                          {guardian.isPrimary && (
                            <span className="sa-status sa-status--success">Primary</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </AdminTable>

              <div className="sa-detail-grid">
                <div>
                  <p className="sa-label">Emergency Contact</p>
                  <p className="sa-value">{selectedStudent.emergencyContact?.fullName || "-"}</p>
                </div>
                <div>
                  <p className="sa-label">Relationship</p>
                  <p className="sa-value">{selectedStudent.emergencyContact?.relationship || "-"}</p>
                </div>
                <div>
                  <p className="sa-label">Phone</p>
                  <p className="sa-value">{selectedStudent.emergencyContact?.phone || "-"}</p>
                </div>
                <div>
                  <p className="sa-label">Email</p>
                  <p className="sa-value">{selectedStudent.emergencyContact?.email || "-"}</p>
                </div>
              </div>

              {isEditingGuardian ? (
                <>
                  <div className="sa-panel sa-form sa-emergency-form">
                    <h4 className="sa-panel-title">Emergency Contact</h4>
                    <div className="sa-form-grid">
                      <label className="sa-field">
                        <span>Full Name</span>
                        <input
                          value={selectedStudent.emergencyContact?.fullName || ""}
                          onChange={(event) => handleEmergencyFieldChange("fullName", event.target.value)}
                        />
                      </label>
                      <label className="sa-field">
                        <span>Relationship</span>
                        <input
                          value={selectedStudent.emergencyContact?.relationship || ""}
                          onChange={(event) => handleEmergencyFieldChange("relationship", event.target.value)}
                        />
                      </label>
                      <label className="sa-field">
                        <span>Phone</span>
                        <input
                          type="tel"
                          value={selectedStudent.emergencyContact?.phone || ""}
                          onChange={(event) => handleEmergencyFieldChange("phone", event.target.value)}
                        />
                      </label>
                      <label className="sa-field">
                        <span>Email</span>
                        <input
                          type="email"
                          value={selectedStudent.emergencyContact?.email || ""}
                          onChange={(event) => handleEmergencyFieldChange("email", event.target.value)}
                        />
                      </label>
                    </div>
                    <p className="sa-inline-note">Changes are saved automatically.</p>
                  </div>

                  <div className="sa-guardian-form">
                    <h4 className="sa-panel-title">Guardian Records</h4>
                    <div className="sa-form-grid">
                      <label className="sa-field">
                        <span>Guardian Name</span>
                        <input
                          value={guardianForm.fullName}
                          onChange={(event) => handleGuardianFormChange("fullName", event.target.value)}
                        />
                      </label>
                      <label className="sa-field">
                        <span>Relationship</span>
                        <input
                          value={guardianForm.relationship}
                          onChange={(event) => handleGuardianFormChange("relationship", event.target.value)}
                        />
                      </label>
                      <label className="sa-field">
                        <span>Phone</span>
                        <input
                          type="tel"
                          value={guardianForm.phone}
                          onChange={(event) => handleGuardianFormChange("phone", event.target.value)}
                        />
                      </label>
                      <label className="sa-field">
                        <span>Email</span>
                        <input
                          type="email"
                          value={guardianForm.email}
                          onChange={(event) => handleGuardianFormChange("email", event.target.value)}
                        />
                      </label>
                      <label className="sa-field">
                        <span>Address</span>
                        <input
                          value={guardianForm.address}
                          onChange={(event) => handleGuardianFormChange("address", event.target.value)}
                        />
                      </label>
                      <label className="sa-field sa-field-inline">
                        <input
                          type="checkbox"
                          checked={guardianForm.isPrimary}
                          onChange={(event) => handleGuardianFormChange("isPrimary", event.target.checked)}
                        />
                        <span>Primary contact</span>
                      </label>
                    </div>
                    <div className="sa-form-actions sa-guardian-form-actions">
                      <button
                        type="button"
                        className="sa-btn sa-btn-primary"
                        onClick={handleGuardianSave}
                      >
                        {editingGuardianIndex !== null ? "Save Guardian" : "Add Guardian"}
                      </button>
                      {editingGuardianIndex !== null && (
                        <button
                          type="button"
                          className="sa-btn sa-btn-ghost"
                          onClick={resetGuardianForm}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                    {guardianMessage && (
                      <p className={guardianMessage.startsWith("Please") ? "sa-error-text" : "sa-success-text"}>
                        {guardianMessage}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="sa-inline-note">
                  Click Edit to modify guardian/emergency contact information.
                </p>
              )}
            </div>
          ) : null}

            {activeTab === "enrollment" ? (
              <AdminTable
                columns={["School Year", "Grade-Section", "Status", "Enrolled At", "Notes"]}
                minWidth={980}
                emptyMessage="No enrollment history."
              >
                {(selectedStudent.enrollmentHistory || []).map((history) => (
                  <tr key={`${history.academicYear}-${history.gradeLevel}-${history.section}`}>
                    <td>{history.academicYear || "-"}</td>
                    <td>
                      {history.gradeLevel || "-"} - {history.section || "-"}
                    </td>
                    <td>{history.enrollmentStatus || "-"}</td>
                    <td>{formatDate(history.enrolledAt)}</td>
                    <td>{history.remarks || "-"}</td>
                  </tr>
                ))}
              </AdminTable>
            ) : null}

            {activeTab === "requirements" ? (
              <>
                <AdminTable
                  columns={["Requirement", "Verification Status", "Uploads", "Verified At", "Notes"]}
                  minWidth={1080}
                >
                  {requiredTypes.map((type) => {
                    const requirement = getRequirement(selectedStudent, type.id);
                    return (
                      <tr key={type.id}>
                        <td>{type.name}</td>
                        <td>
                          <StatusBadge status={requirement.status === "Verified" ? "Complete" : "Missing"} />
                        </td>
                        <td>
                          <div className="sa-upload-cell">
                            {(requirement.documents || []).length ? (
                              <div className="sa-upload-list">
                                {(requirement.documents || []).map((document) => (
                                  <span key={document.fileName} className="sa-upload-item">
                                    {document.fileName}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="sa-muted-inline">No uploads</span>
                            )}
                            <div className="sa-upload-cta">
                              <button
                                type="button"
                                className="sa-btn sa-btn-secondary sa-btn-sm"
                                onClick={() => handleRequirementUploadClick(type.id)}
                              >
                                Upload
                              </button>
                            </div>
                          </div>
                        </td>
                        <td>{formatDate(requirement.verifiedAt)}</td>
                        <td>{requirement.notes || "-"}</td>
                      </tr>
                    );
                  })}
                </AdminTable>
                <input
                  ref={requirementFileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  style={{ display: "none" }}
                  onChange={handleRequirementFileChange}
                />
                {requirementUploadMessage && (
                  <p className="sa-success-text">{requirementUploadMessage}</p>
                )}
              </>
            ) : null}

            {activeTab === "notes" ? (
              <ul className="sa-list">
                {(selectedStudent.notes || []).map((note) => (
                  <li key={note.id}>
                    <strong>{formatDateTime(note.createdAt)}</strong> - {note.note} ({note.createdBy || "Admin"})
                  </li>
                ))}
              </ul>
            ) : null}

            {activeTab === "activity" ? (
              <ul className="sa-list">
                {(selectedStudent.activityLog || []).map((entry) => (
                  <li key={entry.id}>
                    <strong>{entry.action.toUpperCase()}</strong> - {entry.details} ({formatDateTime(entry.createdAt)})
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
