"use client";

import { ChangeEvent, useMemo, useState } from "react";

type BuildingId = "main" | "building2" | "building3";

type Building = {
  id: BuildingId;
  name: "本館" | "2号館" | "3号館";
  actualSeatCount: number;
  defaultUsableSeatCount: number;
};

type BuildingConfig = {
  mainMaxTeachers: number;
  building2MaxTeachers: number;
  building3MaxTeachers: number;
};

type RawRow = {
  id: string;
  period: number;
  sourceImageIndex: 1 | 2;
  teacherName: string;
  studentName: string;
  grade?: string;
  rawText?: string;
};

type LessonStudent = {
  name: string;
  grade?: string;
  isElementary: boolean;
};

type Lesson = {
  id: string;
  period: number;
  teacherName: string;
  students: LessonStudent[];
  hasElementaryStudent: boolean;
};

type AssignmentStatus = "normal" | "continued" | "allowed_move" | "warning";

type Assignment = {
  id: string;
  lessonId: string;
  period: number;
  buildingId: BuildingId;
  buildingName: "本館" | "2号館" | "3号館";
  seatNumber: number;
  seatLabel: string;
  teacherName: string;
  students: LessonStudent[];
  hasElementaryStudent: boolean;
  status: AssignmentStatus;
  moveLabel?: string;
  warningMessages?: string[];
};

type AssignmentOverride = {
  buildingId: BuildingId;
  seatNumber: number;
};

type SeatingWarning = {
  id: string;
  period: number;
  type:
    | "duplicate_teacher"
    | "duplicate_student"
    | "too_many_students"
    | "capacity_exceeded"
    | "unassigned"
    | "discouraged_move"
    | "seat_changed_in_main"
    | "elementary_not_in_main";
  target?: string;
  message: string;
};

type UploadedImage = {
  fileName: string;
  previewUrl: string;
};

type ScreenId = "upload" | "ocr" | "seating" | "teachers" | "students" | "warnings" | "settings";

const periods = [1, 2, 3, 4, 5, 6, 7, 8];
const sourceTabs: Array<1 | 2> = [1, 2];

const buildings: Building[] = [
  { id: "main", name: "本館", actualSeatCount: 14, defaultUsableSeatCount: 14 },
  { id: "building2", name: "2号館", actualSeatCount: 10, defaultUsableSeatCount: 6 },
  { id: "building3", name: "3号館", actualSeatCount: 8, defaultUsableSeatCount: 5 },
];

const defaultBuildingConfig: BuildingConfig = {
  mainMaxTeachers: 14,
  building2MaxTeachers: 6,
  building3MaxTeachers: 5,
};

const mainSeatLayout = [
  ["H-06", null, null, "H-01"],
  ["H-07", "H-04", null, "H-02"],
  ["H-08", "H-05", null, "H-03"],
  ["aisle", "aisle", "aisle", "aisle"],
  ["H-14", "H-12", null, "H-10"],
  ["H-13", "H-11", null, "H-09"],
];

const mainSeatOrder = [1, 4, 7, 2, 5, 8, 3, 10, 12, 14, 9, 11, 13, 6];

const initialRows: RawRow[] = [
  { id: "r1", period: 1, sourceImageIndex: 1, teacherName: "佐藤 光一", studentName: "山田 太郎", grade: "小5" },
  { id: "r2", period: 1, sourceImageIndex: 1, teacherName: "田中 裕二", studentName: "鈴木 花子", grade: "中2" },
  { id: "r3", period: 2, sourceImageIndex: 1, teacherName: "佐藤 光一", studentName: "山田 太郎", grade: "小5" },
  { id: "r4", period: 2, sourceImageIndex: 2, teacherName: "鈴木 美咲", studentName: "高橋 一郎", grade: "小3" },
  { id: "r5", period: 3, sourceImageIndex: 1, teacherName: "伊藤 直樹", studentName: "森 健太", grade: "高1" },
  { id: "r6", period: 3, sourceImageIndex: 1, teacherName: "中村 綾", studentName: "小林 真央", grade: "中3" },
  { id: "r7", period: 4, sourceImageIndex: 1, teacherName: "田中 裕二", studentName: "鈴木 花子", grade: "中2" },
  { id: "r8", period: 4, sourceImageIndex: 2, teacherName: "鈴木 美咲", studentName: "渡辺 悠斗", grade: "小6" },
];

const rawTextSamples: Record<string, string> = {
  "1-1": "講師　生徒　学年　補足1\n佐藤 光一　山田 太郎　小5　なし\n田中 裕二　鈴木 花子　中2　なし",
  "2-1": "講師　生徒　学年　補足1\n佐藤 光一　山田 太郎　小5　なし",
  "2-2": "講師　生徒　学年　補足1\n鈴木 美咲　高橋 一郎　小3　なし",
  "3-1": "担当講師　生徒　学年　補足\n伊藤 直樹　森 健太　高1　なし\n中村 綾　小林 真央　中3　なし",
  "4-1": "先生　生徒　学年\n田中 裕二　鈴木 花子　中2",
  "4-2": "講師　生徒　学年\n鈴木 美咲　渡辺 悠斗　小6",
};

const screens: Array<{ id: ScreenId; label: string; short: string }> = [
  { id: "upload", label: "画像アップロード", short: "画像" },
  { id: "ocr", label: "OCR確認", short: "OCR" },
  { id: "seating", label: "座席表", short: "座席" },
  { id: "teachers", label: "講師ダイアグラム", short: "講師" },
  { id: "students", label: "生徒ダイアグラム", short: "生徒" },
  { id: "warnings", label: "注意・警告一覧", short: "警告" },
  { id: "settings", label: "設定", short: "設定" },
];

function isElementaryGrade(grade?: string) {
  if (!grade) return false;
  return /^(小[1-6]|小学生|小学[1-6]年)$/.test(grade.trim());
}

function buildingName(buildingId: BuildingId) {
  return buildings.find((building) => building.id === buildingId)?.name ?? "本館";
}

function seatLabel(buildingId: BuildingId, seatNumber: number) {
  const prefix = buildingId === "main" ? "H" : buildingId === "building2" ? "2" : "3";
  return `${prefix}-${String(seatNumber).padStart(2, "0")}`;
}

function maxTeachersForBuilding(buildingId: BuildingId, config: BuildingConfig) {
  if (buildingId === "main") return config.mainMaxTeachers;
  if (buildingId === "building2") return config.building2MaxTeachers;
  return config.building3MaxTeachers;
}

function rowsToLessons(rows: RawRow[]): Lesson[] {
  const groups = new Map<string, RawRow[]>();
  for (const row of rows) {
    const teacherName = row.teacherName.trim();
    const key = `${row.period}:${teacherName || row.id}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return Array.from(groups.values()).map((items) => {
    const students = items.map((item) => {
      const grade = item.grade?.trim();
      return {
        name: item.studentName.trim(),
        grade,
        isElementary: isElementaryGrade(grade),
      };
    });
    return {
      id: `lesson-${items[0].period}-${items[0].teacherName.trim() || items[0].id}`,
      period: items[0].period,
      teacherName: items[0].teacherName.trim(),
      students,
      hasElementaryStudent: students.some((student) => student.isElementary),
    };
  });
}

function canUseBuildingAfterPrevious(previous: Assignment | undefined, buildingId: BuildingId) {
  if (!previous) return true;
  if (previous.period + 1 < 1) return true;
  if (previous.buildingId === buildingId) return true;
  return previous.buildingId === "main" && (buildingId === "building2" || buildingId === "building3");
}

function findPreviousAssignment(lesson: Lesson, assignments: Assignment[]) {
  return assignments.find(
    (assignment) =>
      assignment.period === lesson.period - 1 &&
      (assignment.teacherName === lesson.teacherName ||
        lesson.students.some((student) => assignment.students.some((assignedStudent) => assignedStudent.name === student.name))),
  );
}

function createAssignments(lessons: Lesson[], config: BuildingConfig, overrides: Record<string, AssignmentOverride>): Assignment[] {
  const assignments: Assignment[] = [];

  for (const period of periods) {
    const periodLessons = lessons
      .filter((lesson) => lesson.period === period)
      .filter((lesson) => lesson.teacherName && lesson.students.every((student) => student.name) && lesson.students.length <= 2)
      .sort((a, b) => Number(b.hasElementaryStudent) - Number(a.hasElementaryStudent) || a.teacherName.localeCompare(b.teacherName, "ja"));

    const usedSeats: Record<BuildingId, Set<number>> = {
      main: new Set(),
      building2: new Set(),
      building3: new Set(),
    };

    for (const lesson of periodLessons) {
      const previous = findPreviousAssignment(lesson, assignments);
      const override = overrides[lesson.id];
      const baseOrder: BuildingId[] = lesson.hasElementaryStudent ? ["main", "building2", "building3"] : ["main", "building2", "building3"];
      const preferredOrder = previous ? [previous.buildingId, ...baseOrder.filter((id) => id !== previous.buildingId)] : baseOrder;
      const buildingOrder = override ? [override.buildingId, ...preferredOrder.filter((id) => id !== override.buildingId)] : preferredOrder;
      let placed: Assignment | undefined;

      for (const buildingId of buildingOrder) {
        if (!canUseBuildingAfterPrevious(previous, buildingId)) continue;
        if (usedSeats[buildingId].size >= maxTeachersForBuilding(buildingId, config)) continue;

        const seatCandidates =
          buildingId === "main"
            ? [
                ...(override?.buildingId === buildingId ? [override.seatNumber] : []),
                ...(previous?.buildingId === "main" ? [previous.seatNumber] : []),
                ...mainSeatOrder,
              ]
            : [
                ...(override?.buildingId === buildingId ? [override.seatNumber] : []),
                ...Array.from({ length: maxTeachersForBuilding(buildingId, config) }, (_, index) => index + 1),
              ];
        const seatNumber = seatCandidates.find((candidate) => !usedSeats[buildingId].has(candidate));
        if (!seatNumber) continue;

        usedSeats[buildingId].add(seatNumber);
        placed = {
          id: `a-${lesson.id}`,
          lessonId: lesson.id,
          period: lesson.period,
          buildingId,
          buildingName: buildingName(buildingId),
          seatNumber,
          seatLabel: seatLabel(buildingId, seatNumber),
          teacherName: lesson.teacherName,
          students: lesson.students,
          hasElementaryStudent: lesson.hasElementaryStudent,
          status:
            override?.buildingId === buildingId && override.seatNumber === seatNumber
              ? "normal"
              : previous?.buildingId === buildingId && previous?.seatNumber === seatNumber
                ? "continued"
                : previous
                  ? "allowed_move"
                  : "normal",
          moveLabel: previous && previous.buildingId !== buildingId ? `${previous.buildingName} → ${buildingName(buildingId)}` : undefined,
        };
        break;
      }

      if (placed) assignments.push(placed);
    }
  }

  return assignments;
}

function createWarnings(rows: RawRow[], lessons: Lesson[], assignments: Assignment[], config: BuildingConfig): SeatingWarning[] {
  const warnings: SeatingWarning[] = [];
  const assignmentsByLessonId = new Map(assignments.map((assignment) => [assignment.lessonId, assignment]));

  for (const row of rows) {
    if (!row.teacherName.trim() || !row.studentName.trim()) {
      warnings.push({
        id: `w-blank-${row.id}`,
        period: row.period,
        type: "unassigned",
        target: row.teacherName.trim() || row.studentName.trim() || "OCR行",
        message: "講師名または生徒名が空欄です",
      });
    }
  }

  for (const period of periods) {
    const periodRows = rows.filter((row) => row.period === period);
    const students = new Map<string, number>();
    const teachers = new Map<string, number>();

    for (const row of periodRows) {
      const teacherName = row.teacherName.trim();
      const studentName = row.studentName.trim();
      if (teacherName) teachers.set(teacherName, (teachers.get(teacherName) ?? 0) + 1);
      if (studentName) students.set(studentName, (students.get(studentName) ?? 0) + 1);
    }

    for (const [studentName, count] of students.entries()) {
      if (count >= 2) {
        warnings.push({
          id: `w-duplicate-student-${period}-${studentName}`,
          period,
          type: "duplicate_student",
          target: studentName,
          message: "同じコマで生徒が重複しています",
        });
      }
    }

    for (const [teacherName, count] of teachers.entries()) {
      if (count >= 3) {
        warnings.push({
          id: `w-duplicate-teacher-${period}-${teacherName}`,
          period,
          type: "duplicate_teacher",
          target: teacherName,
          message: "同じコマで講師が重複している可能性があります",
        });
      }
    }
  }

  for (const lesson of lessons) {
    const assignment = assignmentsByLessonId.get(lesson.id);
    if (lesson.students.length >= 3) {
      warnings.push({
        id: `w-many-${lesson.id}`,
        period: lesson.period,
        type: "too_many_students",
        target: lesson.teacherName,
        message: "同じコマ・同じ講師に生徒が3人以上います",
      });
    }
    if (!assignment) {
      warnings.push({
        id: `w-unassigned-${lesson.id}`,
        period: lesson.period,
        type: "unassigned",
        target: lesson.teacherName || "未入力",
        message: "未配置の授業があります",
      });
    }
  }

  for (const assignment of assignments) {
    if (assignment.hasElementaryStudent && assignment.buildingId !== "main") {
      warnings.push({
        id: `w-elementary-${assignment.id}`,
        period: assignment.period,
        type: "elementary_not_in_main",
        target: assignment.teacherName,
        message: "小学生を含む授業が本館以外に配置されています",
      });
    }

    const previous = findPreviousAssignment(
      {
        id: assignment.lessonId,
        period: assignment.period,
        teacherName: assignment.teacherName,
        students: assignment.students,
        hasElementaryStudent: assignment.hasElementaryStudent,
      },
      assignments,
    );
    if (previous && previous.buildingId !== assignment.buildingId) {
      const allowed = previous.buildingId === "main" && (assignment.buildingId === "building2" || assignment.buildingId === "building3");
      warnings.push({
        id: `w-move-${assignment.id}`,
        period: assignment.period,
        type: allowed ? "discouraged_move" : "discouraged_move",
        target: assignment.teacherName,
        message: `${previous.buildingName}から${assignment.buildingName}への移動があります`,
      });
    }
    if (previous?.buildingId === "main" && assignment.buildingId === "main" && previous.seatNumber !== assignment.seatNumber) {
      warnings.push({
        id: `w-seat-${assignment.id}`,
        period: assignment.period,
        type: "seat_changed_in_main",
        target: assignment.teacherName,
        message: "本館で連続コマなのに同じ座席を使えませんでした",
      });
    }
  }

  for (const period of periods) {
    for (const building of buildings) {
      const count = assignments.filter((assignment) => assignment.period === period && assignment.buildingId === building.id).length;
      if (count > maxTeachersForBuilding(building.id, config)) {
        warnings.push({
          id: `w-capacity-${period}-${building.id}`,
          period,
          type: "capacity_exceeded",
          target: building.name,
          message: "建物ごとの最大人数を超えています",
        });
      }
    }
  }

  return warnings;
}

function createWarningsLabel(type: SeatingWarning["type"]) {
  const labels: Record<SeatingWarning["type"], string> = {
    duplicate_teacher: "講師重複",
    duplicate_student: "生徒重複",
    too_many_students: "生徒3人以上",
    capacity_exceeded: "定員超過",
    unassigned: "未配置",
    discouraged_move: "建物移動",
    seat_changed_in_main: "座席変更",
    elementary_not_in_main: "小学生",
  };
  return labels[type];
}

function createUnassignedLessons(lessons: Lesson[], assignments: Assignment[]) {
  const assignedIds = new Set(assignments.map((assignment) => assignment.lessonId));
  return lessons.filter((lesson) => !assignedIds.has(lesson.id));
}

function getAssignmentSummary(assignments: Assignment[], warnings: SeatingWarning[]) {
  return {
    assignedCount: assignments.length,
    warningCount: warnings.length,
    unassignedCount: warnings.filter((warning) => warning.type === "unassigned").length,
  };
}

function buildOutputText(assignments: Assignment[], warnings: SeatingWarning[]) {
  const lines = ["塾 座席割り振り", ""];
  for (const period of periods) {
    const periodAssignments = assignments.filter((assignment) => assignment.period === period);
    lines.push(`${period}コマ`);
    if (periodAssignments.length === 0) {
      lines.push("配置なし");
    } else {
      for (const assignment of periodAssignments) {
        lines.push(`${assignment.buildingName} ${assignment.seatLabel} ${assignment.teacherName}`);
      }
    }
    lines.push("");
  }
  lines.push("注意・警告");
  if (warnings.length === 0) {
    lines.push("なし");
  } else {
    for (const warning of warnings) {
      lines.push(`${warning.period}コマ ${createWarningsLabel(warning.type)} ${warning.target ?? "全体"} ${warning.message}`);
    }
  }
  return lines.join("\n");
}

function parseOcrText(text: string, period: number, sourceImageIndex: 1 | 2): RawRow[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const headerIndex = lines.findIndex((line) => /(講師|担当講師|先生)/.test(line) && line.includes("生徒") && line.includes("学年"));
  if (headerIndex < 0) return [];
  return lines.slice(headerIndex + 1).map((line, index) => {
    const parsed = parseDataLine(line);
    return {
      id: `ocr-${period}-${sourceImageIndex}-${Date.now()}-${index}`,
      period,
      sourceImageIndex,
      teacherName: parsed.teacherName,
      studentName: parsed.studentName,
      grade: parsed.grade,
      rawText: line,
    };
  });
}

function parseDataLine(line: string) {
  const tokens = line.split(/[\s　\t]+/).filter(Boolean);
  const gradeIndex = tokens.findIndex((token) => /^(小[1-6]|中[1-3]|高[1-3]|小学生|小学[1-6]年)$/.test(token));
  const grade = gradeIndex >= 0 ? tokens[gradeIndex] : tokens[4];
  const nameTokens = tokens.slice(0, gradeIndex >= 0 ? gradeIndex : 4);

  if (nameTokens.length >= 4) {
    return {
      teacherName: nameTokens.slice(0, 2).join(" "),
      studentName: nameTokens.slice(2).join(" "),
      grade,
    };
  }
  if (nameTokens.length === 3) {
    return {
      teacherName: nameTokens[0],
      studentName: nameTokens.slice(1).join(" "),
      grade,
    };
  }
  return {
    teacherName: nameTokens[0] ?? "",
    studentName: nameTokens[1] ?? "",
    grade,
  };
}

async function runOcrPlaceholder(period: number, sourceImageIndex: 1 | 2): Promise<RawRow[]> {
  const sample =
    rawTextSamples[`${period}-${sourceImageIndex}`] ??
    `講師　生徒　学年\n仮 講師${period}${sourceImageIndex}　仮 生徒${period}${sourceImageIndex}　中1`;
  return parseOcrText(sample, period, sourceImageIndex);
}

function classNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function Home() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>("upload");
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [selectedSource, setSelectedSource] = useState<1 | 2>(1);
  const [rows, setRows] = useState<RawRow[]>(initialRows);
  const [images, setImages] = useState<Record<number, Partial<Record<1 | 2, UploadedImage>>>>({});
  const [config, setConfig] = useState<BuildingConfig>(defaultBuildingConfig);
  const [assignmentOverrides, setAssignmentOverrides] = useState<Record<string, AssignmentOverride>>({});
  const [ocrBusy, setOcrBusy] = useState(false);

  const lessons = useMemo(() => rowsToLessons(rows), [rows]);
  const assignments = useMemo(() => createAssignments(lessons, config, assignmentOverrides), [lessons, config, assignmentOverrides]);
  const warnings = useMemo(() => createWarnings(rows, lessons, assignments, config), [rows, lessons, assignments, config]);
  const unassignedLessons = useMemo(() => createUnassignedLessons(lessons, assignments), [lessons, assignments]);
  const assignmentSummary = useMemo(() => getAssignmentSummary(assignments, warnings), [assignments, warnings]);
  const teacherNames = useMemo(() => Array.from(new Set(rows.map((row) => row.teacherName).filter(Boolean))).sort(), [rows]);

  const selectedRows = rows.filter((row) => row.period === selectedPeriod && row.sourceImageIndex === selectedSource);
  const selectedTitle = screens.find((screen) => screen.id === activeScreen)?.label ?? "";

  function updateRow(id: string, key: keyof RawRow, value: string) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  }

  function addRow() {
    setRows((current) => [
      ...current,
      {
        id: `manual-${Date.now()}`,
        period: selectedPeriod,
        sourceImageIndex: selectedSource,
        teacherName: "",
        studentName: "",
        grade: "",
      },
    ]);
  }

  function deleteRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  function updateAssignmentOverride(lessonId: string, override?: AssignmentOverride) {
    setAssignmentOverrides((current) => {
      const next = { ...current };
      if (override) {
        next[lessonId] = override;
      } else {
        delete next[lessonId];
      }
      return next;
    });
  }

  function handleImage(event: ChangeEvent<HTMLInputElement>, source: 1 | 2) {
    const file = event.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setImages((current) => ({
      ...current,
      [selectedPeriod]: {
        ...(current[selectedPeriod] ?? {}),
        [source]: { fileName: file.name, previewUrl },
      },
    }));
  }

  function deleteImage(source: 1 | 2) {
    const image = images[selectedPeriod]?.[source];
    if (image) URL.revokeObjectURL(image.previewUrl);
    setImages((current) => ({
      ...current,
      [selectedPeriod]: { ...(current[selectedPeriod] ?? {}), [source]: undefined },
    }));
  }

  async function runOcr() {
    setOcrBusy(true);
    const result1 = await runOcrPlaceholder(selectedPeriod, 1);
    const result2 = images[selectedPeriod]?.[2] ? await runOcrPlaceholder(selectedPeriod, 2) : [];
    setRows((current) => [
      ...current.filter((row) => row.period !== selectedPeriod),
      ...result1,
      ...result2,
    ]);
    setSelectedSource(1);
    setActiveScreen("ocr");
    setOcrBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-white shadow-[0_0_0_1px_rgba(37,99,235,0.08)]">
      <header className="sticky top-0 z-10 border-b border-line bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-appblue">塾 座席割り振り</p>
            <h1 className="text-lg font-bold tracking-normal">{selectedTitle}</h1>
          </div>
          <div className="rounded-md border border-line px-2 py-1 text-xs font-bold text-slate-600">
            {rows.length} 行
          </div>
        </div>
        <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
          {screens.map((screen) => (
            <button
              key={screen.id}
              type="button"
              onClick={() => setActiveScreen(screen.id)}
              className={classNames(
                "shrink-0 rounded-md border px-3 py-2 text-sm font-bold transition active:translate-y-px",
                activeScreen === screen.id
                  ? "border-appblue bg-appblue text-white"
                  : "border-line bg-white text-slate-600",
              )}
            >
              {screen.short}
            </button>
          ))}
        </div>
      </header>

      <section className="flex-1 px-4 py-4 pb-24">
        {activeScreen === "upload" && (
          <UploadScreen
            selectedPeriod={selectedPeriod}
            setSelectedPeriod={setSelectedPeriod}
            images={images}
            handleImage={handleImage}
            deleteImage={deleteImage}
            runOcr={runOcr}
            ocrBusy={ocrBusy}
          />
        )}
        {activeScreen === "ocr" && (
          <OcrScreen
            selectedPeriod={selectedPeriod}
            setSelectedPeriod={setSelectedPeriod}
            selectedSource={selectedSource}
            setSelectedSource={setSelectedSource}
            selectedRows={selectedRows}
            periodLessons={lessons.filter((lesson) => lesson.period === selectedPeriod)}
            teacherNames={teacherNames}
            updateRow={updateRow}
            deleteRow={deleteRow}
            addRow={addRow}
          />
        )}
        {activeScreen === "seating" && (
          <SeatingScreen
            selectedPeriod={selectedPeriod}
            setSelectedPeriod={setSelectedPeriod}
            assignments={assignments}
            unassignedLessons={unassignedLessons}
            summary={assignmentSummary}
            config={config}
            overrides={assignmentOverrides}
            updateOverride={updateAssignmentOverride}
          />
        )}
        {activeScreen === "teachers" && <DiagramScreen mode="teachers" assignments={assignments} />}
        {activeScreen === "students" && <DiagramScreen mode="students" assignments={assignments} />}
        {activeScreen === "warnings" && <WarningsScreen warnings={warnings} assignments={assignments} />}
        {activeScreen === "settings" && <SettingsScreen config={config} setConfig={setConfig} />}
      </section>
    </main>
  );
}

function PeriodPicker({ selectedPeriod, onChange }: { selectedPeriod: number; onChange: (period: number) => void }) {
  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
      {periods.map((period) => (
        <button
          key={period}
          type="button"
          onClick={() => onChange(period)}
          className={classNames(
            "h-10 min-w-12 rounded-md border px-3 text-sm font-bold active:translate-y-px",
            selectedPeriod === period ? "border-appblue bg-blue-50 text-appblue" : "border-line bg-white text-slate-600",
          )}
        >
          {period}コマ
        </button>
      ))}
    </div>
  );
}

function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-bold">{title}</h2>
      {right}
    </div>
  );
}

function UploadScreen(props: {
  selectedPeriod: number;
  setSelectedPeriod: (period: number) => void;
  images: Record<number, Partial<Record<1 | 2, UploadedImage>>>;
  handleImage: (event: ChangeEvent<HTMLInputElement>, source: 1 | 2) => void;
  deleteImage: (source: 1 | 2) => void;
  runOcr: () => void;
  ocrBusy: boolean;
}) {
  const periodImages = props.images[props.selectedPeriod] ?? {};
  return (
    <div className="space-y-5">
      <PeriodPicker selectedPeriod={props.selectedPeriod} onChange={props.setSelectedPeriod} />
      <SectionTitle title={`${props.selectedPeriod}コマの画像一覧`} />
      <div className="grid gap-3">
        {sourceTabs.map((source) => {
          const image = periodImages[source];
          return (
            <div key={source} className="rounded-md border border-line bg-slate-50 p-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-bold">一覧表{source}</div>
                <span className="text-xs text-slate-500">最大2枚</span>
              </div>
              {image ? (
                <div className="space-y-3">
                  <img src={image.previewUrl} alt={`一覧表${source}`} className="h-36 w-full rounded-md object-cover" />
                  <p className="truncate text-sm text-slate-600">{image.fileName}</p>
                  <div className="flex gap-2">
                    <label className="flex-1 cursor-pointer rounded-md border border-appblue bg-white px-3 py-2 text-center text-sm font-bold text-appblue active:translate-y-px">
                      画像を変更
                      <input className="hidden" type="file" accept="image/*" capture="environment" onChange={(event) => props.handleImage(event, source)} />
                    </label>
                    <button type="button" onClick={() => props.deleteImage(source)} className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-600 active:translate-y-px">
                      削除
                    </button>
                  </div>
                </div>
              ) : (
                <label className="block cursor-pointer rounded-md border border-dashed border-blue-300 bg-white px-3 py-8 text-center text-sm font-bold text-appblue active:translate-y-px">
                  画像を追加
                  <input className="hidden" type="file" accept="image/*" capture="environment" onChange={(event) => props.handleImage(event, source)} />
                </label>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={props.runOcr}
        disabled={props.ocrBusy}
        className="w-full rounded-md bg-appblue px-4 py-3 text-sm font-bold text-white disabled:bg-slate-300 active:translate-y-px"
      >
        {props.ocrBusy ? "OCR実行中" : `${props.selectedPeriod}コマのOCR実行`}
      </button>
    </div>
  );
}

function OcrScreen(props: {
  selectedPeriod: number;
  setSelectedPeriod: (period: number) => void;
  selectedSource: 1 | 2;
  setSelectedSource: (source: 1 | 2) => void;
  selectedRows: RawRow[];
  periodLessons: Lesson[];
  teacherNames: string[];
  updateRow: (id: string, key: keyof RawRow, value: string) => void;
  deleteRow: (id: string) => void;
  addRow: () => void;
}) {
  return (
    <div className="space-y-4">
      <PeriodPicker selectedPeriod={props.selectedPeriod} onChange={props.setSelectedPeriod} />
      <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-1">
        {sourceTabs.map((source) => (
          <button
            key={source}
            type="button"
            onClick={() => props.setSelectedSource(source)}
            className={classNames("rounded-md px-3 py-2 text-sm font-bold", props.selectedSource === source ? "bg-white text-appblue shadow-sm" : "text-slate-500")}
          >
            一覧表{source}
          </button>
        ))}
      </div>
      <datalist id="teacher-candidates">
        {props.teacherNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <div className="space-y-3">
        {props.selectedRows.map((row) => (
          <div key={row.id} className="rounded-md border border-line p-3">
            <div className="grid gap-3">
              <Field label="講師">
                <input list="teacher-candidates" value={row.teacherName} onChange={(event) => props.updateRow(row.id, "teacherName", event.target.value)} className="input" />
              </Field>
              <Field label="生徒">
                <input value={row.studentName} onChange={(event) => props.updateRow(row.id, "studentName", event.target.value)} className="input" />
              </Field>
              <Field label="学年">
                <input value={row.grade ?? ""} onChange={(event) => props.updateRow(row.id, "grade", event.target.value)} className="input" />
              </Field>
            </div>
            <div className="mt-3 flex justify-end">
              <button type="button" onClick={() => props.deleteRow(row.id)} className="rounded-md border border-red-200 px-3 py-2 text-sm font-bold text-red-600 active:translate-y-px">
                削除
              </button>
            </div>
          </div>
        ))}
      </div>
      {props.selectedRows.length === 0 && <EmptyState text="この一覧表のOCR行はまだありません" />}
      <button type="button" onClick={props.addRow} className="w-full rounded-md border border-appblue bg-white px-4 py-3 text-sm font-bold text-appblue active:translate-y-px">
        行を追加
      </button>
      <details className="rounded-md border border-line bg-slate-50 p-3">
        <summary className="cursor-pointer font-bold">元OCRテキスト</summary>
        <pre className="mt-3 whitespace-pre-wrap rounded-md bg-white p-3 text-xs text-slate-600">
          {rawTextSamples[`${props.selectedPeriod}-${props.selectedSource}`] ?? "OCRテキストは未取得です"}
        </pre>
      </details>
      <div className="rounded-md border border-line p-3">
        <SectionTitle title={`${props.selectedPeriod}コマの統合プレビュー`} />
        <div className="grid gap-2">
          {props.periodLessons.map((lesson) => (
            <div key={lesson.id} className="rounded-md bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-bold">{lesson.teacherName || "講師未入力"}</div>
                <span className={classNames("rounded-md px-2 py-1 text-xs font-bold", lesson.students.length >= 3 ? "bg-red-50 text-red-600" : "bg-blue-50 text-appblue")}>
                  {lesson.students.length}人
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {lesson.students.map((student) => (
                  <span key={`${lesson.id}-${student.name}-${student.grade}`} className="rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-600">
                    {student.name || "生徒未入力"} {student.grade ? `/ ${student.grade}` : ""}
                  </span>
                ))}
                {lesson.hasElementaryStudent && <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">本館優先</span>}
              </div>
            </div>
          ))}
          {props.periodLessons.length === 0 && <EmptyState text="統合できるOCR行はまだありません" />}
        </div>
      </div>
    </div>
  );
}

function SeatingScreen(props: {
  selectedPeriod: number;
  setSelectedPeriod: (period: number) => void;
  assignments: Assignment[];
  unassignedLessons: Lesson[];
  summary: ReturnType<typeof getAssignmentSummary>;
  config: BuildingConfig;
  overrides: Record<string, AssignmentOverride>;
  updateOverride: (lessonId: string, override?: AssignmentOverride) => void;
}) {
  const periodAssignments = props.assignments.filter((assignment) => assignment.period === props.selectedPeriod);
  const periodUnassigned = props.unassignedLessons.filter((lesson) => lesson.period === props.selectedPeriod);
  const bySeat = new Map(periodAssignments.map((assignment) => [assignment.seatLabel, assignment]));
  const remote = (buildingId: BuildingId) => periodAssignments.filter((assignment) => assignment.buildingId === buildingId);
  return (
    <div className="space-y-5">
      <PeriodPicker selectedPeriod={props.selectedPeriod} onChange={props.setSelectedPeriod} />
      <div className="grid grid-cols-3 gap-2">
        <MetricCard label="配置済み" value={`${props.summary.assignedCount}`} />
        <MetricCard label="未配置" value={`${props.summary.unassignedCount}`} tone={props.summary.unassignedCount > 0 ? "warn" : "normal"} />
        <MetricCard label="警告" value={`${props.summary.warningCount}`} tone={props.summary.warningCount > 0 ? "warn" : "normal"} />
      </div>
      <SectionTitle title="本館" right={<span className="text-xs font-bold text-slate-500">実レイアウト</span>} />
      <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
        <div className="grid grid-cols-4 gap-2">
          {mainSeatLayout.flatMap((row, rowIndex) =>
            row.map((seat, colIndex) => {
              if (seat === "aisle") {
                return colIndex === 0 ? (
                  <div key={`${rowIndex}-${colIndex}`} className="col-span-4 rounded-md border border-dashed border-blue-200 py-2 text-center text-xs font-bold text-blue-500">
                    通路
                  </div>
                ) : null;
              }
              if (!seat) return <div key={`${rowIndex}-${colIndex}`} />;
              const assignment = bySeat.get(seat);
              return (
                <div key={seat} className="min-h-16 rounded-md border border-blue-200 bg-white p-2">
                  <div className="text-[10px] font-bold text-blue-500">{seat}</div>
                  <div className="mt-1 text-sm font-bold leading-tight">{assignment?.teacherName ?? ""}</div>
                </div>
              );
            }),
          )}
        </div>
      </div>
      <RemoteBuilding title="2号館" assignments={remote("building2")} color="green" />
      <RemoteBuilding title="3号館" assignments={remote("building3")} color="purple" />
      <AdjustmentPanel
        assignments={periodAssignments}
        config={props.config}
        overrides={props.overrides}
        updateOverride={props.updateOverride}
      />
      {periodUnassigned.length > 0 && (
        <div>
          <SectionTitle title="未配置" />
          <div className="grid gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
            {periodUnassigned.map((lesson) => (
              <div key={lesson.id} className="rounded-md bg-white px-3 py-2 text-sm font-bold text-amber-800">
                {lesson.teacherName || "講師未入力"} / {lesson.students.map((student) => student.name || "生徒未入力").join("、")}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AdjustmentPanel({
  assignments,
  config,
  overrides,
  updateOverride,
}: {
  assignments: Assignment[];
  config: BuildingConfig;
  overrides: Record<string, AssignmentOverride>;
  updateOverride: (lessonId: string, override?: AssignmentOverride) => void;
}) {
  if (assignments.length === 0) return null;
  return (
    <div>
      <SectionTitle title="手動調整" />
      <div className="grid gap-2 rounded-md border border-line p-3">
        {assignments.map((assignment) => {
          const override = overrides[assignment.lessonId];
          const buildingId = override?.buildingId ?? assignment.buildingId;
          const maxSeat = maxTeachersForBuilding(buildingId, config);
          return (
            <div key={assignment.id} className="rounded-md bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-sm font-bold">{assignment.teacherName}</div>
                <button
                  type="button"
                  onClick={() => updateOverride(assignment.lessonId)}
                  className="rounded-md border border-line bg-white px-2 py-1 text-xs font-bold text-slate-600 active:translate-y-px"
                >
                  自動
                </button>
              </div>
              <div className="grid grid-cols-[1fr_90px] gap-2">
                <label className="grid gap-1">
                  <span className="text-xs font-bold text-slate-500">建物</span>
                  <select
                    className="input"
                    value={buildingId}
                    onChange={(event) => {
                      const nextBuildingId = event.target.value as BuildingId;
                      updateOverride(assignment.lessonId, { buildingId: nextBuildingId, seatNumber: 1 });
                    }}
                  >
                    {buildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-bold text-slate-500">座席</span>
                  <select
                    className="input"
                    value={Math.min(override?.seatNumber ?? assignment.seatNumber, maxSeat)}
                    onChange={(event) => updateOverride(assignment.lessonId, { buildingId, seatNumber: Number(event.target.value) })}
                  >
                    {Array.from({ length: maxSeat }, (_, index) => index + 1).map((seatNumber) => (
                      <option key={seatNumber} value={seatNumber}>
                        {seatNumber}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricCard({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "warn" }) {
  return (
    <div className={classNames("rounded-md border p-2", tone === "warn" ? "border-amber-200 bg-amber-50" : "border-line bg-slate-50")}>
      <div className="text-[11px] font-bold text-slate-500">{label}</div>
      <div className={classNames("mt-1 text-lg font-bold", tone === "warn" ? "text-amber-700" : "text-ink")}>{value}</div>
    </div>
  );
}

function RemoteBuilding({ title, assignments, color }: { title: string; assignments: Assignment[]; color: "green" | "purple" }) {
  const tone = color === "green" ? "border-green-100 bg-green-50 text-green-700" : "border-purple-100 bg-purple-50 text-purple-700";
  return (
    <div>
      <SectionTitle title={title} />
      <div className={classNames("rounded-md border p-3", tone)}>
        {assignments.length ? (
          <div className="grid gap-2">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="rounded-md bg-white px-3 py-2 text-sm font-bold text-ink">
                {assignment.teacherName}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm font-bold">配置なし</div>
        )}
      </div>
    </div>
  );
}

function DiagramScreen({ mode, assignments }: { mode: "teachers" | "students"; assignments: Assignment[] }) {
  const people = useMemo(() => {
    if (mode === "teachers") return Array.from(new Set(assignments.map((assignment) => assignment.teacherName))).map((name) => ({ key: name, label: name }));
    const studentMap = new Map<string, { key: string; label: string }>();
    for (const assignment of assignments) {
      for (const student of assignment.students) {
        studentMap.set(student.name, { key: student.name, label: student.isElementary ? `${student.name}\n${student.grade}` : student.name });
      }
    }
    return Array.from(studentMap.values());
  }, [assignments, mode]);

  function findAssignment(personKey: string, period: number) {
    return assignments.find((assignment) => assignment.period === period && (mode === "teachers" ? assignment.teacherName === personKey : assignment.students.some((student) => student.name === personKey)));
  }

  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="min-w-[780px] border-collapse text-left text-xs">
        <thead>
          <tr className="bg-slate-50">
            <th className="sticky left-0 z-[1] w-32 border-b border-line bg-slate-50 p-2">対象</th>
            {periods.map((period) => (
              <th key={period} className="border-b border-line p-2 text-center">{period}コマ</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {people.map((person) => (
            <tr key={person.key}>
              <th className="sticky left-0 z-[1] whitespace-pre-line border-b border-line bg-white p-2 font-bold">{person.label}</th>
              {periods.map((period) => {
                const assignment = findAssignment(person.key, period);
                return (
                  <td key={period} className="border-b border-line p-2">
                    <div className="flex items-center gap-1">
                      <DiagramCell assignment={assignment} />
                      {period < 8 && <span className="text-slate-300">→</span>}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiagramCell({ assignment }: { assignment?: Assignment }) {
  if (!assignment) return <div className="min-w-16 text-center font-bold text-slate-400">-</div>;
  const color =
    assignment.buildingId === "main"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : assignment.buildingId === "building2"
        ? "border-green-200 bg-green-50 text-green-700"
        : "border-purple-200 bg-purple-50 text-purple-700";
  return (
    <div className={classNames("min-w-16 rounded-md border px-2 py-1 text-center font-bold leading-tight", color)}>
      <div>{assignment.buildingName}</div>
      <div>{assignment.seatLabel}</div>
    </div>
  );
}

function WarningsScreen({ warnings, assignments }: { warnings: SeatingWarning[]; assignments: Assignment[] }) {
  const [copied, setCopied] = useState(false);
  const outputText = useMemo(() => buildOutputText(assignments, warnings), [assignments, warnings]);

  async function copyOutput() {
    await navigator.clipboard.writeText(outputText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-line p-3">
        <SectionTitle title="出力" />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={copyOutput} className="rounded-md bg-appblue px-3 py-3 text-sm font-bold text-white active:translate-y-px">
            {copied ? "コピー済み" : "テキストコピー"}
          </button>
          <button type="button" onClick={() => window.print()} className="rounded-md border border-appblue bg-white px-3 py-3 text-sm font-bold text-appblue active:translate-y-px">
            印刷
          </button>
        </div>
        <textarea className="input mt-3 min-h-32 text-xs" value={outputText} readOnly />
      </div>
      {warnings.map((warning) => (
        <div key={warning.id} className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-amber-700">{createWarningsLabel(warning.type)}</span>
            <span className="text-xs font-bold text-amber-700">{warning.period}コマ</span>
          </div>
          <div className="text-sm font-bold">{warning.target ?? "全体"}</div>
          <p className="mt-1 text-sm text-slate-700">{warning.message}</p>
        </div>
      ))}
      {warnings.length === 0 && <EmptyState text="注意・警告はありません" />}
    </div>
  );
}

function SettingsScreen({ config, setConfig }: { config: BuildingConfig; setConfig: (config: BuildingConfig) => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-line p-3">
        <div className="text-sm font-bold">本館最大講師人数</div>
        <div className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-lg font-bold">14 固定</div>
      </div>
      <RangeSetting
        label="2号館最大講師人数"
        value={config.building2MaxTeachers}
        min={1}
        max={10}
        onChange={(value) => setConfig({ ...config, building2MaxTeachers: value })}
      />
      <RangeSetting
        label="3号館最大講師人数"
        value={config.building3MaxTeachers}
        min={1}
        max={8}
        onChange={(value) => setConfig({ ...config, building3MaxTeachers: value })}
      />
    </div>
  );
}

function RangeSetting({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="rounded-md border border-line p-3">
      <div className="mb-3 flex items-center justify-between">
        <label className="text-sm font-bold">{label}</label>
        <span className="rounded-md bg-blue-50 px-3 py-1 text-sm font-bold text-appblue">{value}人</span>
      </div>
      <input className="w-full accent-blue-600" type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <div className="mt-1 flex justify-between text-xs font-bold text-slate-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-line bg-slate-50 px-3 py-8 text-center text-sm font-bold text-slate-500">{text}</div>;
}
