import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import {
  getBookmarksForUser,
  getNote,
  getNotesForUser,
  isBookmarked,
  lessonBelongsToCourse,
  saveNote,
  toggleBookmark,
} from "./saved.server";

type TestDb = ReturnType<typeof createTestDb>;

const EARLIER = new Date(2026, 9, 6, 12, 0, 0);
const LATER = new Date(2026, 9, 7, 12, 0, 0);

let db: TestDb;
let base: ReturnType<typeof seedBaseData>;
let lessonId: number;
let otherLessonId: number;
let otherStudentId: number;

beforeEach(() => {
  db = createTestDb();
  base = seedBaseData(db);

  const module = db
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Basics", position: 1 })
    .returning()
    .get();

  lessonId = db
    .insert(schema.lessons)
    .values({ moduleId: module.id, title: "Lesson 1", position: 1 })
    .returning()
    .get().id;

  otherLessonId = db
    .insert(schema.lessons)
    .values({ moduleId: module.id, title: "Lesson 2", position: 2 })
    .returning()
    .get().id;

  otherStudentId = db
    .insert(schema.users)
    .values({
      name: "Other Student",
      email: "other@example.com",
      role: schema.UserRole.Student,
    })
    .returning()
    .get().id;
});

describe("toggling a Bookmark", () => {
  it("bookmarks a Lesson that was not bookmarked", () => {
    expect(toggleBookmark(db, base.user.id, lessonId, EARLIER)).toBe(true);
    expect(isBookmarked(db, base.user.id, lessonId)).toBe(true);
  });

  it("removes the Bookmark when toggled again", () => {
    toggleBookmark(db, base.user.id, lessonId, EARLIER);

    expect(toggleBookmark(db, base.user.id, lessonId, LATER)).toBe(false);
    expect(isBookmarked(db, base.user.id, lessonId)).toBe(false);
  });

  it("keeps one Bookmark per Student per Lesson", () => {
    toggleBookmark(db, base.user.id, lessonId, EARLIER);
    toggleBookmark(db, base.user.id, lessonId, LATER);
    toggleBookmark(db, base.user.id, lessonId, LATER);

    expect(db.select().from(schema.bookmarks).all()).toHaveLength(1);
  });

  it("does not touch another Student's Bookmark", () => {
    toggleBookmark(db, otherStudentId, lessonId, EARLIER);
    toggleBookmark(db, base.user.id, lessonId, EARLIER);
    toggleBookmark(db, base.user.id, lessonId, LATER);

    expect(isBookmarked(db, otherStudentId, lessonId)).toBe(true);
    expect(isBookmarked(db, base.user.id, lessonId)).toBe(false);
  });
});

describe("saving a Note", () => {
  it("writes a new Note with the body trimmed", () => {
    expect(
      saveNote(db, base.user.id, lessonId, "  Remember this  ", EARLIER)
    ).toBe("saved");

    expect(getNote(db, base.user.id, lessonId)).toMatchObject({
      body: "Remember this",
      createdAt: EARLIER.toISOString(),
      updatedAt: EARLIER.toISOString(),
    });
  });

  it("replaces the earlier Note and keeps its created time", () => {
    saveNote(db, base.user.id, lessonId, "First draft", EARLIER);
    saveNote(db, base.user.id, lessonId, "Second draft", LATER);

    expect(db.select().from(schema.notes).all()).toHaveLength(1);
    expect(getNote(db, base.user.id, lessonId)).toMatchObject({
      body: "Second draft",
      createdAt: EARLIER.toISOString(),
      updatedAt: LATER.toISOString(),
    });
  });

  it("deletes the Note when saved with an empty body", () => {
    saveNote(db, base.user.id, lessonId, "Something", EARLIER);

    expect(saveNote(db, base.user.id, lessonId, "   ", LATER)).toBe("deleted");
    expect(getNote(db, base.user.id, lessonId)).toBeUndefined();
  });

  it("treats an empty body with no Note as a delete", () => {
    expect(saveNote(db, base.user.id, lessonId, "", EARLIER)).toBe("deleted");
    expect(db.select().from(schema.notes).all()).toHaveLength(0);
  });

  it("does not touch another Student's Note on the same Lesson", () => {
    saveNote(db, otherStudentId, lessonId, "Theirs", EARLIER);
    saveNote(db, base.user.id, lessonId, "Mine", EARLIER);
    saveNote(db, base.user.id, lessonId, "", LATER);

    expect(getNote(db, otherStudentId, lessonId)?.body).toBe("Theirs");
  });
});

describe("checking a Lesson belongs to a Course", () => {
  it("accepts a Lesson in the Course", () => {
    expect(lessonBelongsToCourse(db, lessonId, base.course.id)).toBe(true);
  });

  it("refuses a Lesson from another Course", () => {
    const otherCourse = db
      .insert(schema.courses)
      .values({
        title: "Other Course",
        slug: "other-course",
        description: "Another course",
        salesCopy: "## Other Course",
        instructorId: base.instructor.id,
        categoryId: base.category.id,
        status: schema.CourseStatus.Published,
      })
      .returning()
      .get();

    expect(lessonBelongsToCourse(db, lessonId, otherCourse.id)).toBe(false);
  });

  it("refuses a Lesson that does not exist", () => {
    expect(lessonBelongsToCourse(db, 9999, base.course.id)).toBe(false);
  });
});

describe("listing saved Lessons", () => {
  it("lists only the Student's own Bookmarks, newest first, with where each Lesson sits", () => {
    toggleBookmark(db, base.user.id, lessonId, EARLIER);
    toggleBookmark(db, base.user.id, otherLessonId, LATER);
    toggleBookmark(db, otherStudentId, lessonId, LATER);

    expect(getBookmarksForUser(db, base.user.id)).toEqual([
      expect.objectContaining({
        lessonId: otherLessonId,
        lessonTitle: "Lesson 2",
        moduleTitle: "Basics",
        courseTitle: "Test Course",
        courseSlug: "test-course",
      }),
      expect.objectContaining({ lessonId, lessonTitle: "Lesson 1" }),
    ]);
  });

  it("lists only the Student's own Notes, most recently edited first", () => {
    saveNote(db, base.user.id, lessonId, "On lesson 1", EARLIER);
    saveNote(db, base.user.id, otherLessonId, "On lesson 2", EARLIER);
    saveNote(db, base.user.id, lessonId, "Edited lesson 1", LATER);
    saveNote(db, otherStudentId, lessonId, "Not mine", LATER);

    expect(getNotesForUser(db, base.user.id)).toEqual([
      expect.objectContaining({ lessonId, body: "Edited lesson 1" }),
      expect.objectContaining({ lessonId: otherLessonId, body: "On lesson 2" }),
    ]);
  });

  it("returns empty lists for a Student with nothing saved", () => {
    expect(getBookmarksForUser(db, base.user.id)).toEqual([]);
    expect(getNotesForUser(db, base.user.id)).toEqual([]);
  });
});
