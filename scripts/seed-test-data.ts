import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.production' })
dotenv.config()

const dbUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL
const prisma = new PrismaClient({
  datasourceUrl: dbUrl
})

async function main() {
  console.log('🌱 Starting test data seeding for EDUPLATFORM...')

  // Step 0: Clean up any existing test data associated with @helix.test
  const testEmails = [
    'admin@helix.test',
    'teacher@helix.test',
    'assistant@helix.test',
    'student@helix.test',
    'parent@helix.test',
    'emma@helix.test',
    'ryan@helix.test'
  ]

  console.log('🧹 Cleaning up existing test users and associated data...')

  const existingTestUsers = await prisma.user.findMany({
    where: { email: { in: testEmails } },
    select: { id: true }
  })
  const existingUserIds = existingTestUsers.map(u => u.id)

  if (existingUserIds.length > 0) {
    // Delete notifications, messages, attempts, answers, posts, replies, enrollments
    await prisma.notification.deleteMany({ where: { userId: { in: existingUserIds } } })
    await prisma.directMessage.deleteMany({
      where: {
        OR: [{ senderId: { in: existingUserIds } }, { recipientId: { in: existingUserIds } }]
      }
    })
    await prisma.answer.deleteMany({ where: { attempt: { userId: { in: existingUserIds } } } })
    await prisma.quizAttempt.deleteMany({ where: { userId: { in: existingUserIds } } })
    await prisma.forumReply.deleteMany({ where: { authorId: { in: existingUserIds } } })
    await prisma.forumPost.deleteMany({ where: { authorId: { in: existingUserIds } } })
    await prisma.studyMaterial.deleteMany({ where: { authorId: { in: existingUserIds } } })
    await prisma.announcement.deleteMany({ where: { authorId: { in: existingUserIds } } })
    await prisma.attendanceRecord.deleteMany({ where: { userId: { in: existingUserIds } } })
    await prisma.studentEnrollment.deleteMany({ where: { studentId: { in: existingUserIds } } })
    await prisma.subjectBranchTeacherAssistant.deleteMany({ where: { assistantId: { in: existingUserIds } } })
    await prisma.subjectBranchTeacher.deleteMany({ where: { teacherId: { in: existingUserIds } } })
    await prisma.studentProfile.deleteMany({ where: { userId: { in: existingUserIds } } })
    await prisma.parentProfile.deleteMany({ where: { userId: { in: existingUserIds } } })
    await prisma.activeSession.deleteMany({ where: { userId: { in: existingUserIds } } })
    await prisma.loginAuditLog.deleteMany({ where: { userId: { in: existingUserIds } } })
    await prisma.securityAlert.deleteMany({ where: { userId: { in: existingUserIds } } })
    await prisma.user.deleteMany({ where: { id: { in: existingUserIds } } })
  }

  // Clean up existing Test Branch and Batch if they exist
  const existingBranch = await prisma.branch.findFirst({ where: { name: 'Helix Test Campus' } })
  if (existingBranch) {
    await prisma.examRecord.deleteMany({ where: { subject: { branchTeachers: { some: { branchId: existingBranch.id } } } } })
    await prisma.examSession.deleteMany({ where: { subject: { branchTeachers: { some: { branchId: existingBranch.id } } } } })
    await prisma.classResource.deleteMany({ where: { session: { subject: { branchTeachers: { some: { branchId: existingBranch.id } } } } } })
    await prisma.question.deleteMany({ where: { quiz: { branchId: existingBranch.id } } })
    await prisma.quiz.deleteMany({ where: { branchId: existingBranch.id } })
    await prisma.classSession.deleteMany({ where: { subject: { branchTeachers: { some: { branchId: existingBranch.id } } } } })
    await prisma.syllabusObjective.deleteMany({ where: { subject: { branchTeachers: { some: { branchId: existingBranch.id } } } } })
    await prisma.subjectBranchTeacher.deleteMany({ where: { branchId: existingBranch.id } })
    await prisma.subject.deleteMany({ where: { batch: { name: 'Cambridge A Level Biology 2026' } } })
    await prisma.batchBranch.deleteMany({ where: { branchId: existingBranch.id } })
    await prisma.batch.deleteMany({ where: { name: 'Cambridge A Level Biology 2026' } })
    await prisma.branch.delete({ where: { id: existingBranch.id } })
  }

  console.log('👥 Creating test accounts...')

  const adminPass = await bcryptjs.hash('HelixAdmin2026!', 12)
  const teacherPass = await bcryptjs.hash('HelixTeacher2026!', 12)
  const assistPass = await bcryptjs.hash('HelixAssist2026!', 12)
  const studentPass = await bcryptjs.hash('HelixStudent2026!', 12)
  const parentPass = await bcryptjs.hash('HelixParent2026!', 12)
  const dummyPass = await bcryptjs.hash('HelixTest2026!', 12)

  // 1. Super Admin
  await prisma.user.create({
    data: {
      name: 'Dr. Admin',
      email: 'admin@helix.test',
      passwordHash: adminPass,
      role: 'SUPER_ADMIN',
      approvalStatus: 'APPROVED'
    }
  })

  // 2. Teacher
  const teacherUser = await prisma.user.create({
    data: {
      name: 'Ms. Sarah Smith',
      email: 'teacher@helix.test',
      passwordHash: teacherPass,
      role: 'TEACHER',
      approvalStatus: 'APPROVED',
      subjectArea: 'Biology'
    }
  })

  // 3. Assistant
  const assistantUser = await prisma.user.create({
    data: {
      name: 'Mr. James Assist',
      email: 'assistant@helix.test',
      passwordHash: assistPass,
      role: 'ASSISTANT',
      approvalStatus: 'APPROVED'
    }
  })

  // 4. Parent User
  const parentUser = await prisma.user.create({
    data: {
      name: 'Mr. David Johnson',
      email: 'parent@helix.test',
      passwordHash: parentPass,
      role: 'PARENT',
      approvalStatus: 'APPROVED'
    }
  })

  const parentProfile = await prisma.parentProfile.create({
    data: {
      userId: parentUser.id,
      phone: '+94-77-9876543'
    }
  })

  // 5. Main Student: Alex Johnson
  const studentAlex = await prisma.user.create({
    data: {
      name: 'Alex Johnson',
      email: 'student@helix.test',
      passwordHash: studentPass,
      role: 'STUDENT',
      approvalStatus: 'APPROVED'
    }
  })

  await prisma.studentProfile.create({
    data: {
      userId: studentAlex.id,
      parentId: parentProfile.id,
      paymentStatus: 'Paid',
      helixScore: 175,
      stars: 9,
      totalStars: 9,
      medals: 2,
      goldMedals: 1,
      silverMedals: 1,
      bronzeMedals: 0,
      quizCount: 2,
      perfectScores: 0
    }
  })

  // 6. Student 2: Emma Clarke
  const studentEmma = await prisma.user.create({
    data: {
      name: 'Emma Clarke',
      email: 'emma@helix.test',
      passwordHash: dummyPass,
      role: 'STUDENT',
      approvalStatus: 'APPROVED'
    }
  })

  await prisma.studentProfile.create({
    data: {
      userId: studentEmma.id,
      paymentStatus: 'Paid',
      helixScore: 140,
      stars: 7,
      totalStars: 7,
      medals: 2,
      goldMedals: 0,
      silverMedals: 1,
      bronzeMedals: 1,
      quizCount: 2,
      perfectScores: 0
    }
  })

  // 7. Student 3: Ryan Patel
  const studentRyan = await prisma.user.create({
    data: {
      name: 'Ryan Patel',
      email: 'ryan@helix.test',
      passwordHash: dummyPass,
      role: 'STUDENT',
      approvalStatus: 'APPROVED'
    }
  })

  await prisma.studentProfile.create({
    data: {
      userId: studentRyan.id,
      paymentStatus: 'Paid',
      helixScore: 95,
      stars: 5,
      totalStars: 5,
      medals: 1,
      goldMedals: 0,
      silverMedals: 0,
      bronzeMedals: 1,
      quizCount: 2,
      perfectScores: 0
    }
  })

  console.log('🏢 Creating Branch, Batch & Subject...')

  // 1. Branch
  const branch = await prisma.branch.create({
    data: {
      name: 'Helix Test Campus',
      type: 'Physical',
      address: '123 Education Lane, Colombo',
      colour: '#2979ff'
    }
  })

  // 2. Batch
  const batch = await prisma.batch.create({
    data: {
      name: 'Cambridge A Level Biology 2026',
      academicLevel: 'A Level',
      description: 'Test batch for A Level Biology',
      status: 'active'
    }
  })

  // BatchBranch junction
  await prisma.batchBranch.create({
    data: {
      batchId: batch.id,
      branchId: branch.id,
      status: 'active'
    }
  })

  // 3. Subject
  const subject = await prisma.subject.create({
    data: {
      name: 'Biology',
      batchId: batch.id,
      colour: '#2979ff',
      description: 'Cambridge A Level Biology'
    }
  })

  // SubjectBranchTeacher
  const sbt = await prisma.subjectBranchTeacher.create({
    data: {
      subjectId: subject.id,
      branchId: branch.id,
      teacherId: teacherUser.id
    }
  })

  // Assistant permissions
  const assistantPermissions = [
    'Mark attendance',
    'Grade assignments',
    'Post resources',
    'Manage forum',
    'View student performance',
    'Send announcements',
    'Create quizzes',
    'View contact details'
  ]

  await prisma.subjectBranchTeacherAssistant.create({
    data: {
      subjectBranchTeacherId: sbt.id,
      assistantId: assistantUser.id,
      permissions: JSON.stringify(assistantPermissions),
      assignedByTeacherId: teacherUser.id
    }
  })

  // 4. Student Enrolment
  console.log('📝 Enrolling students...')
  const enrolledStudents = [studentAlex, studentEmma, studentRyan]
  for (const st of enrolledStudents) {
    await prisma.studentEnrollment.create({
      data: {
        studentId: st.id,
        batchId: batch.id,
        branchId: branch.id,
        subjectId: subject.id,
        status: 'active',
        confirmedByTeacherId: teacherUser.id,
        adminApprovedAt: new Date(),
        teacherConfirmedAt: new Date()
      }
    })
  }

  // 5. Syllabus Objectives
  console.log('📚 Creating Syllabus Objectives...')
  const objectivesData = [
    { code: 'BIO-1.1', description: 'Cell structure and organelles part 1' },
    { code: 'BIO-1.2', description: 'Cell structure and organelles part 2' },
    { code: 'BIO-1.3', description: 'Mitochondria structure' },
    { code: 'BIO-1.4', description: 'ATP Synthesis' },
    { code: 'BIO-2.1', description: 'DNA Structure' },
    { code: 'BIO-2.2', description: 'DNA Replication' },
    { code: 'BIO-2.3', description: 'Protein Synthesis' },
    { code: 'BIO-2.4', description: 'Gene Expression' },
    { code: 'BIO-3.1', description: 'Cell Division' },
    { code: 'BIO-3.2', description: 'Meiosis' },
    { code: 'BIO-4.1', description: 'Enzymes' },
    { code: 'BIO-4.2', description: 'Metabolism' },
    { code: 'BIO-4.3', description: 'Membrane Transport' },
    { code: 'BIO-5.1', description: 'Light Dependent Photosynthesis' },
    { code: 'BIO-5.2', description: 'Light Independent Photosynthesis' }
  ]

  const objectivesMap: Record<string, { id: string; code: string }> = {}
  for (const obj of objectivesData) {
    const createdObj = await prisma.syllabusObjective.upsert({
      where: { code: obj.code },
      update: { subjectId: subject.id, description: obj.description },
      create: {
        code: obj.code,
        description: obj.description,
        curriculum: 'Cambridge A Level',
        subjectId: subject.id
      }
    })
    objectivesMap[obj.code] = createdObj
  }

  // 6. Class Sessions (5 past, 3 upcoming)
  console.log('📅 Creating Class Sessions & Attendance...')
  const now = new Date()

  function getPastDate(daysAgo: number, hour = 10, minute = 0) {
    const d = new Date(now)
    d.setDate(d.getDate() - daysAgo)
    d.setHours(hour, minute, 0, 0)
    return d
  }

  function getFutureDate(daysAhead: number, hour = 10, minute = 0) {
    const d = new Date(now)
    d.setDate(d.getDate() + daysAhead)
    d.setHours(hour, minute, 0, 0)
    return d
  }

  // Session 1: 3 weeks (21 days) ago
  const dateS1 = getPastDate(21, 10, 0)
  const session1 = await prisma.classSession.create({
    data: {
      subjectId: subject.id,
      title: 'Cell Structure & Organelles',
      description: 'Overview of cell organelles and eukaryotic cell structure.',
      scheduledDate: dateS1,
      durationMins: 60,
      status: 'TAUGHT',
      taughtAt: dateS1,
      classType: 'PHYSICAL',
      syllabusCodes: 'BIO-1.1, BIO-1.2',
      resourcesList: JSON.stringify([{ title: 'Cell Structure Notes.pdf', url: '/uploads/Cell Structure Notes.pdf', type: 'PDF' }]),
      syllabusObjectives: {
        connect: [objectivesMap['BIO-1.1'], objectivesMap['BIO-1.2']].map(o => ({ id: o.id }))
      }
    }
  })

  await prisma.classResource.create({
    data: {
      sessionId: session1.id,
      title: 'Cell Structure Notes.pdf',
      url: '/uploads/Cell Structure Notes.pdf',
      type: 'PDF',
      isPreWatch: true
    }
  })

  // Session 2: 2 weeks (14 days) ago
  const dateS2 = getPastDate(14, 10, 0)
  const session2 = await prisma.classSession.create({
    data: {
      subjectId: subject.id,
      title: 'Mitochondria & ATP Synthesis',
      description: 'Mitochondrial membrane structures and ATP synthesis mechanisms.',
      scheduledDate: dateS2,
      durationMins: 60,
      status: 'TAUGHT',
      taughtAt: dateS2,
      classType: 'PHYSICAL',
      syllabusCodes: 'BIO-1.3, BIO-1.4',
      resourcesList: JSON.stringify([{ title: 'ATP Synthesis Video', url: 'https://www.youtube.com/watch?v=00jbG_cfGuQ', type: 'LINK' }]),
      syllabusObjectives: {
        connect: [objectivesMap['BIO-1.3'], objectivesMap['BIO-1.4']].map(o => ({ id: o.id }))
      }
    }
  })

  await prisma.classResource.create({
    data: {
      sessionId: session2.id,
      title: 'ATP Synthesis Video',
      url: 'https://www.youtube.com/watch?v=00jbG_cfGuQ',
      type: 'LINK',
      isPreWatch: true
    }
  })

  // Session 3: 10 days ago
  const dateS3 = getPastDate(10, 10, 0)
  const session3 = await prisma.classSession.create({
    data: {
      subjectId: subject.id,
      title: 'DNA Structure & Replication',
      description: 'Double helix geometry and semi-conservative replication model.',
      scheduledDate: dateS3,
      durationMins: 90,
      status: 'TAUGHT',
      taughtAt: dateS3,
      classType: 'ONLINE',
      meetingLink: 'https://meet.google.com/helix-bio-dna',
      syllabusCodes: 'BIO-2.1, BIO-2.2',
      syllabusObjectives: {
        connect: [objectivesMap['BIO-2.1'], objectivesMap['BIO-2.2']].map(o => ({ id: o.id }))
      }
    }
  })

  // Session 4: 5 days ago
  const dateS4 = getPastDate(5, 10, 0)
  const session4 = await prisma.classSession.create({
    data: {
      subjectId: subject.id,
      title: 'Protein Synthesis & Gene Expression',
      description: 'Transcription, mRNA processing, and ribosomal translation.',
      scheduledDate: dateS4,
      durationMins: 60,
      status: 'TAUGHT',
      taughtAt: dateS4,
      classType: 'PHYSICAL',
      syllabusCodes: 'BIO-2.3, BIO-2.4',
      syllabusObjectives: {
        connect: [objectivesMap['BIO-2.3'], objectivesMap['BIO-2.4']].map(o => ({ id: o.id }))
      }
    }
  })

  // Session 5: 1 day ago
  const dateS5 = getPastDate(1, 10, 0)
  const session5 = await prisma.classSession.create({
    data: {
      subjectId: subject.id,
      title: 'Cell Division & Meiosis',
      description: 'Mitosis vs meiosis and genetic variation generation.',
      scheduledDate: dateS5,
      durationMins: 60,
      status: 'TAUGHT',
      taughtAt: dateS5,
      classType: 'PHYSICAL',
      syllabusCodes: 'BIO-3.1, BIO-3.2',
      syllabusObjectives: {
        connect: [objectivesMap['BIO-3.1'], objectivesMap['BIO-3.2']].map(o => ({ id: o.id }))
      }
    }
  })

  // Upcoming Session 6: 3 days from now at 10:00 (or 09:45 broadcast note)
  const dateS6 = getFutureDate(3, 10, 0)
  await prisma.classSession.create({
    data: {
      subjectId: subject.id,
      title: 'Enzymes & Metabolism',
      description: 'Enzyme kinetics, activation energy, and metabolic pathways.',
      scheduledDate: dateS6,
      durationMins: 60,
      status: 'SCHEDULED',
      classType: 'PHYSICAL',
      syllabusCodes: 'BIO-4.1, BIO-4.2',
      syllabusObjectives: {
        connect: [objectivesMap['BIO-4.1'], objectivesMap['BIO-4.2']].map(o => ({ id: o.id }))
      }
    }
  })

  // Upcoming Session 7: 7 days from now
  const dateS7 = getFutureDate(7, 10, 0)
  await prisma.classSession.create({
    data: {
      subjectId: subject.id,
      title: 'Membrane Transport',
      description: 'Passive diffusion, facilitated transport, and active transport ion pumps.',
      scheduledDate: dateS7,
      durationMins: 60,
      status: 'SCHEDULED',
      classType: 'PHYSICAL',
      syllabusCodes: 'BIO-4.3',
      syllabusObjectives: {
        connect: [objectivesMap['BIO-4.3']].map(o => ({ id: o.id }))
      }
    }
  })

  // Upcoming Session 8: 14 days from now
  const dateS8 = getFutureDate(14, 10, 0)
  await prisma.classSession.create({
    data: {
      subjectId: subject.id,
      title: 'Photosynthesis',
      description: 'Light-dependent and light-independent reactions of photosynthesis.',
      scheduledDate: dateS8,
      durationMins: 90,
      status: 'SCHEDULED',
      classType: 'PHYSICAL',
      syllabusCodes: 'BIO-5.1, BIO-5.2',
      syllabusObjectives: {
        connect: [objectivesMap['BIO-5.1'], objectivesMap['BIO-5.2']].map(o => ({ id: o.id }))
      }
    }
  })

  // 7. Attendance Records for Alex Johnson (Sessions 1-5)
  // Session 1: Present, Session 2: Present, Session 3: Present, Session 4: Absent, Session 5: Present
  const alexAttendanceData = [
    { sessionId: session1.id, status: 'PRESENT' },
    { sessionId: session2.id, status: 'PRESENT' },
    { sessionId: session3.id, status: 'PRESENT' },
    { sessionId: session4.id, status: 'ABSENT' },
    { sessionId: session5.id, status: 'PRESENT' }
  ]

  for (const att of alexAttendanceData) {
    await prisma.attendanceRecord.create({
      data: {
        classSessionId: att.sessionId,
        userId: studentAlex.id,
        status: att.status
      }
    })
  }

  // Attendance for Emma & Ryan so stats are populated
  for (const s of [session1, session2, session3, session4, session5]) {
    await prisma.attendanceRecord.create({
      data: { classSessionId: s.id, userId: studentEmma.id, status: 'PRESENT' }
    })
    await prisma.attendanceRecord.create({
      data: { classSessionId: s.id, userId: studentRyan.id, status: 'PRESENT' }
    })
  }

  console.log('✍️ Creating Quizzes, Questions & Student Submissions...')

  // Quiz 1: Cell Structure MCQ Test
  const quiz1DueDate = getPastDate(14, 23, 59)
  const quiz1 = await prisma.quiz.create({
    data: {
      batchId: batch.id,
      subjectId: subject.id,
      branchId: branch.id,
      teacherId: teacherUser.id,
      linkedSessionId: session1.id,
      title: 'Cell Structure MCQ Test',
      description: 'Assessment on organelle structure and cellular function.',
      chapter: 'Cell Biology',
      topic: 'Cell Structure & Organelles',
      status: 'CLOSED',
      dueDate: quiz1DueDate,
      allowOneAttempt: true,
      markingMode: 'AUTO_AI'
    }
  })

  const q1_1 = await prisma.question.create({
    data: {
      quizId: quiz1.id,
      type: 'MCQ',
      text: 'Which organelle is known as the powerhouse of the cell?',
      options: JSON.stringify(['A) Nucleus', 'B) Mitochondria', 'C) Ribosome', 'D) Golgi apparatus']),
      correctOption: 1,
      maxMarks: 2,
      points: 2,
      orderIndex: 0
    }
  })

  const q1_2 = await prisma.question.create({
    data: {
      quizId: quiz1.id,
      type: 'MCQ',
      text: 'What is the function of the cell membrane?',
      options: JSON.stringify(['A) Energy production', 'B) Protein synthesis', 'C) Controls what enters and exits the cell', 'D) DNA storage']),
      correctOption: 2,
      maxMarks: 2,
      points: 2,
      orderIndex: 1
    }
  })

  const q1_3 = await prisma.question.create({
    data: {
      quizId: quiz1.id,
      type: 'MCQ',
      text: 'Which organelle contains digestive enzymes?',
      options: JSON.stringify(['A) Mitochondria', 'B) Nucleus', 'C) Lysosome', 'D) Vacuole']),
      correctOption: 2,
      maxMarks: 2,
      points: 2,
      orderIndex: 2
    }
  })

  const q1_4 = await prisma.question.create({
    data: {
      quizId: quiz1.id,
      type: 'SHORT_ANSWER',
      text: 'Describe the structure and function of the rough endoplasmic reticulum.',
      markScheme: 'Should mention ribosomes on surface, protein synthesis, transport of proteins, connected to nuclear envelope',
      markingCriteria: 'Ribosomes on surface, protein synthesis, transport of proteins, connected to nuclear envelope',
      maxMarks: 4,
      points: 4,
      orderIndex: 3
    }
  })

  // Quiz 1 Attempt - Alex Johnson (Score 9/10, 95 points, 5 stars, Gold medal)
  await prisma.quizAttempt.create({
    data: {
      quizId: quiz1.id,
      userId: studentAlex.id,
      score: 9,
      maxPossibleScore: 10,
      percentageScore: 90.0,
      status: 'GRADED',
      markingStatus: 'fully_graded',
      helixPointsAwarded: 95,
      bonusPoints: 25,
      starsAwarded: 5,
      medalAwarded: 'gold',
      rankInBatch: 1,
      submittedAt: getPastDate(14, 11, 0),
      answers: {
        create: [
          { questionId: q1_1.id, selectedOption: 1, isCorrect: true, marksAwarded: 2, pointsAwarded: 2, gradingMethod: 'auto', aiFeedback: 'Correct selection.' },
          { questionId: q1_2.id, selectedOption: 2, isCorrect: true, marksAwarded: 2, pointsAwarded: 2, gradingMethod: 'auto', aiFeedback: 'Correct selection.' },
          { questionId: q1_3.id, selectedOption: 2, isCorrect: true, marksAwarded: 2, pointsAwarded: 2, gradingMethod: 'auto', aiFeedback: 'Correct selection.' },
          {
            questionId: q1_4.id,
            answerText: 'The rough ER has ribosomes on its surface which synthesise proteins. These proteins are then transported to the Golgi apparatus.',
            shortAnswerText: 'The rough ER has ribosomes on its surface which synthesise proteins. These proteins are then transported to the Golgi apparatus.',
            isCorrect: true,
            marksAwarded: 3,
            pointsAwarded: 3,
            gradingMethod: 'ai',
            aiFeedback: 'Good answer covering ribosomes and protein synthesis. Could mention connection to nuclear envelope for full marks.',
            keyPointsCovered: JSON.stringify(['ribosomes on surface', 'protein synthesis', 'transport of proteins']),
            keyPointsMissed: JSON.stringify(['connected to nuclear envelope'])
          }
        ]
      }
    }
  })

  // Quiz 1 Attempt - Emma Clarke (Score 8/10, 70 pts, Silver medal)
  await prisma.quizAttempt.create({
    data: {
      quizId: quiz1.id,
      userId: studentEmma.id,
      score: 8,
      maxPossibleScore: 10,
      percentageScore: 80.0,
      status: 'GRADED',
      markingStatus: 'fully_graded',
      helixPointsAwarded: 70,
      bonusPoints: 0,
      starsAwarded: 4,
      medalAwarded: 'silver',
      rankInBatch: 2,
      submittedAt: getPastDate(14, 11, 30),
      answers: {
        create: [
          { questionId: q1_1.id, selectedOption: 1, isCorrect: true, marksAwarded: 2, pointsAwarded: 2, gradingMethod: 'auto' },
          { questionId: q1_2.id, selectedOption: 2, isCorrect: true, marksAwarded: 2, pointsAwarded: 2, gradingMethod: 'auto' },
          { questionId: q1_3.id, selectedOption: 2, isCorrect: true, marksAwarded: 2, pointsAwarded: 2, gradingMethod: 'auto' },
          { questionId: q1_4.id, answerText: 'Ribosomes synthesise proteins on the endoplasmic reticulum surface.', isCorrect: true, marksAwarded: 2, pointsAwarded: 2, gradingMethod: 'ai', aiFeedback: 'Basic explanation covered.' }
        ]
      }
    }
  })

  // Quiz 1 Attempt - Ryan Patel (Score 6/10, 55 pts, Bronze medal)
  await prisma.quizAttempt.create({
    data: {
      quizId: quiz1.id,
      userId: studentRyan.id,
      score: 6,
      maxPossibleScore: 10,
      percentageScore: 60.0,
      status: 'GRADED',
      markingStatus: 'fully_graded',
      helixPointsAwarded: 55,
      bonusPoints: 0,
      starsAwarded: 3,
      medalAwarded: 'bronze',
      rankInBatch: 3,
      submittedAt: getPastDate(14, 12, 0),
      answers: {
        create: [
          { questionId: q1_1.id, selectedOption: 1, isCorrect: true, marksAwarded: 2, pointsAwarded: 2, gradingMethod: 'auto' },
          { questionId: q1_2.id, selectedOption: 2, isCorrect: true, marksAwarded: 2, pointsAwarded: 2, gradingMethod: 'auto' },
          { questionId: q1_3.id, selectedOption: 0, isCorrect: false, marksAwarded: 0, pointsAwarded: 0, gradingMethod: 'auto' },
          { questionId: q1_4.id, answerText: 'It transports proteins in the cell.', isCorrect: true, marksAwarded: 2, pointsAwarded: 2, gradingMethod: 'ai', aiFeedback: 'Partial answer.' }
        ]
      }
    }
  })


  // Quiz 2: Mitochondria & ATP Short Answer Quiz
  const quiz2DueDate = getPastDate(10, 23, 59)
  const quiz2 = await prisma.quiz.create({
    data: {
      batchId: batch.id,
      subjectId: subject.id,
      branchId: branch.id,
      teacherId: teacherUser.id,
      linkedSessionId: session2.id,
      title: 'Mitochondria & ATP Short Answer Quiz',
      description: 'Assessment on Krebs cycle, chemiosmosis, and electron transport chain.',
      chapter: 'Bioenergetics',
      topic: 'Mitochondria & ATP Synthesis',
      status: 'CLOSED',
      dueDate: quiz2DueDate,
      allowOneAttempt: true,
      markingMode: 'AUTO_AI'
    }
  })

  const q2_1 = await prisma.question.create({
    data: {
      quizId: quiz2.id,
      type: 'MCQ',
      text: 'Where does the Krebs cycle occur?',
      options: JSON.stringify(['A) Cytoplasm', 'B) Matrix of mitochondria', 'C) Inner membrane', 'D) Nucleus']),
      correctOption: 1,
      maxMarks: 2,
      points: 2,
      orderIndex: 0
    }
  })

  const q2_2 = await prisma.question.create({
    data: {
      quizId: quiz2.id,
      type: 'SHORT_ANSWER',
      text: 'Explain the process of oxidative phosphorylation.',
      markScheme: 'Mention electron transport chain, proton gradient, ATP synthase, chemiosmosis, oxygen as final electron acceptor',
      markingCriteria: 'Mention electron transport chain, proton gradient, ATP synthase, chemiosmosis, oxygen as final electron acceptor',
      maxMarks: 4,
      points: 4,
      orderIndex: 1
    }
  })

  const q2_3 = await prisma.question.create({
    data: {
      quizId: quiz2.id,
      type: 'SHORT_ANSWER',
      text: 'What is the role of NAD in cellular respiration?',
      markScheme: 'Electron carrier, reduced to NADH, carries electrons to electron transport chain, regenerated during oxidative phosphorylation',
      markingCriteria: 'Electron carrier, reduced to NADH, carries electrons to electron transport chain, regenerated during oxidative phosphorylation',
      maxMarks: 4,
      points: 4,
      orderIndex: 2
    }
  })

  // Quiz 2 Attempt - Alex Johnson (Score 8/10, 80 pts, 4 stars, Silver medal)
  await prisma.quizAttempt.create({
    data: {
      quizId: quiz2.id,
      userId: studentAlex.id,
      score: 8,
      maxPossibleScore: 10,
      percentageScore: 80.0,
      status: 'GRADED',
      markingStatus: 'fully_graded',
      helixPointsAwarded: 80,
      bonusPoints: 0,
      starsAwarded: 4,
      medalAwarded: 'silver',
      rankInBatch: 1,
      submittedAt: getPastDate(10, 11, 0),
      answers: {
        create: [
          { questionId: q2_1.id, selectedOption: 1, isCorrect: true, marksAwarded: 2, pointsAwarded: 2, gradingMethod: 'auto', aiFeedback: 'Correct selection.' },
          {
            questionId: q2_2.id,
            answerText: 'Electrons from NADH pass through the electron transport chain creating a proton gradient. ATP synthase uses this gradient to make ATP.',
            shortAnswerText: 'Electrons from NADH pass through the electron transport chain creating a proton gradient. ATP synthase uses this gradient to make ATP.',
            isCorrect: true,
            marksAwarded: 3,
            pointsAwarded: 3,
            gradingMethod: 'ai',
            aiFeedback: 'Great explanation covering electron transport chain and proton gradient.'
          },
          {
            questionId: q2_3.id,
            answerText: 'NAD carries electrons and is reduced to NADH which then goes to the electron transport chain.',
            shortAnswerText: 'NAD carries electrons and is reduced to NADH which then goes to the electron transport chain.',
            isCorrect: true,
            marksAwarded: 3,
            pointsAwarded: 3,
            gradingMethod: 'ai',
            aiFeedback: 'Accurate summary of electron transport role.'
          }
        ]
      }
    }
  })

  // Quiz 2 Attempt - Emma Clarke (Score 7/10, 70 pts, Bronze medal)
  await prisma.quizAttempt.create({
    data: {
      quizId: quiz2.id,
      userId: studentEmma.id,
      score: 7,
      maxPossibleScore: 10,
      percentageScore: 70.0,
      status: 'GRADED',
      markingStatus: 'fully_graded',
      helixPointsAwarded: 70,
      bonusPoints: 0,
      starsAwarded: 3,
      medalAwarded: 'bronze',
      rankInBatch: 2,
      submittedAt: getPastDate(10, 11, 30),
      answers: {
        create: [
          { questionId: q2_1.id, selectedOption: 1, isCorrect: true, marksAwarded: 2, pointsAwarded: 2, gradingMethod: 'auto' },
          { questionId: q2_2.id, answerText: 'Proton gradient drives ATP synthase to produce ATP in mitochondria.', isCorrect: true, marksAwarded: 3, pointsAwarded: 3, gradingMethod: 'ai' },
          { questionId: q2_3.id, answerText: 'NAD accepts hydrogen and carries electrons.', isCorrect: true, marksAwarded: 2, pointsAwarded: 2, gradingMethod: 'ai' }
        ]
      }
    }
  })

  // Quiz 2 Attempt - Ryan Patel (Score 4/10, 40 pts, no medal)
  await prisma.quizAttempt.create({
    data: {
      quizId: quiz2.id,
      userId: studentRyan.id,
      score: 4,
      maxPossibleScore: 10,
      percentageScore: 40.0,
      status: 'GRADED',
      markingStatus: 'fully_graded',
      helixPointsAwarded: 40,
      bonusPoints: 0,
      starsAwarded: 2,
      medalAwarded: 'none',
      rankInBatch: 3,
      submittedAt: getPastDate(10, 12, 0),
      answers: {
        create: [
          { questionId: q2_1.id, selectedOption: 1, isCorrect: true, marksAwarded: 2, pointsAwarded: 2, gradingMethod: 'auto' },
          { questionId: q2_2.id, answerText: 'Energy is made in inner membrane.', isCorrect: false, marksAwarded: 1, pointsAwarded: 1, gradingMethod: 'ai' },
          { questionId: q2_3.id, answerText: 'NAD helps enzymes.', isCorrect: false, marksAwarded: 1, pointsAwarded: 1, gradingMethod: 'ai' }
        ]
      }
    }
  })


  // Quiz 3: DNA & Genetics Assessment (Published, due in 3 days, NOT submitted by Alex)
  const quiz3DueDate = getFutureDate(3, 23, 59)
  const quiz3 = await prisma.quiz.create({
    data: {
      batchId: batch.id,
      subjectId: subject.id,
      branchId: branch.id,
      teacherId: teacherUser.id,
      linkedSessionId: session3.id,
      title: 'DNA & Genetics Assessment',
      description: 'Assessment covering DNA structure, base pairing rules, and semi-conservative replication.',
      chapter: 'Genetics',
      topic: 'DNA Structure & Replication',
      status: 'PUBLISHED',
      dueDate: quiz3DueDate,
      allowOneAttempt: true,
      markingMode: 'AUTO_AI'
    }
  })

  await prisma.question.create({
    data: {
      quizId: quiz3.id,
      type: 'MCQ',
      text: 'What is the base pairing rule for DNA?',
      options: JSON.stringify(['A) A-G, T-C', 'B) A-T, G-C', 'C) A-C, T-G', 'D) A-U, G-C']),
      correctOption: 1,
      maxMarks: 2,
      points: 2,
      orderIndex: 0
    }
  })

  await prisma.question.create({
    data: {
      quizId: quiz3.id,
      type: 'MCQ',
      text: 'During which phase does DNA replication occur?',
      options: JSON.stringify(['A) G1', 'B) G2', 'C) S phase', 'D) M phase']),
      correctOption: 2,
      maxMarks: 2,
      points: 2,
      orderIndex: 1
    }
  })

  await prisma.question.create({
    data: {
      quizId: quiz3.id,
      type: 'ESSAY',
      text: 'Describe the process of DNA replication and explain why it is described as semi-conservative.',
      markScheme: 'Helicase unwinds, primers added, DNA polymerase, complementary base pairing, two strands each with one original one new, semi-conservative means each daughter has one original strand',
      markingCriteria: 'Helicase unwinds, primers added, DNA polymerase, complementary base pairing, two strands each with one original one new, semi-conservative means each daughter has one original strand',
      maxMarks: 6,
      points: 6,
      orderIndex: 2
    }
  })

  console.log('💬 Creating Forum Posts & Replies...')

  // Post 1: Alex Johnson (1 week ago)
  const post1 = await prisma.forumPost.create({
    data: {
      batchId: batch.id,
      authorId: studentAlex.id,
      title: 'Question about ATP synthesis',
      content: 'Can someone explain the difference between substrate-level phosphorylation and oxidative phosphorylation? I get confused between the two.',
      pinned: false,
      createdAt: getPastDate(7, 14, 0)
    }
  })

  await prisma.forumReply.create({
    data: {
      postId: post1.id,
      authorId: teacherUser.id,
      content: 'Great question Alex! Substrate-level phosphorylation occurs directly during glycolysis and the Krebs cycle when a phosphate group is transferred directly to ADP. Oxidative phosphorylation uses the electron transport chain and chemiosmosis. Does that help?',
      createdAt: getPastDate(7, 15, 30)
    }
  })

  // Post 2: Emma Clarke (5 days ago)
  const post2 = await prisma.forumPost.create({
    data: {
      batchId: batch.id,
      authorId: studentEmma.id,
      title: 'DNA replication resources',
      content: 'Has anyone found any good resources for understanding DNA replication? The upcoming quiz looks tricky.',
      pinned: false,
      createdAt: getPastDate(5, 11, 0)
    }
  })

  await prisma.forumReply.create({
    data: {
      postId: post2.id,
      authorId: studentAlex.id,
      content: 'The notes from Session 3 are really helpful! Also check the pre-class resources.',
      createdAt: getPastDate(5, 12, 15)
    }
  })

  // Post 3: Pinned post by Ms. Sarah Smith (3 days ago)
  await prisma.forumPost.create({
    data: {
      batchId: batch.id,
      authorId: teacherUser.id,
      title: 'Reminder: Quiz 3 due in 3 days',
      content: 'Just a reminder that the DNA & Genetics Assessment is due in 3 days. Make sure to review Sessions 3 and 4 notes. Good luck everyone!',
      pinned: true,
      createdAt: getPastDate(3, 9, 0)
    }
  })

  console.log('📖 Creating Resources Library (Study Materials)...')

  await prisma.studyMaterial.createMany({
    data: [
      {
        subjectId: subject.id,
        authorId: teacherUser.id,
        title: 'Cell Structure Complete Notes',
        type: 'PDF',
        url: '/uploads/Cell Structure Complete Notes.pdf',
        createdAt: getPastDate(20)
      },
      {
        subjectId: subject.id,
        authorId: teacherUser.id,
        title: 'ATP Synthesis Explained',
        type: 'LINK',
        url: 'https://www.youtube.com/watch?v=00jbG_cfGuQ',
        createdAt: getPastDate(13)
      },
      {
        subjectId: subject.id,
        authorId: teacherUser.id,
        title: 'DNA Replication Animation',
        type: 'LINK',
        url: 'https://www.youtube.com/watch?v=TNKWgcFPHqw',
        createdAt: getPastDate(9)
      },
      {
        subjectId: subject.id,
        authorId: teacherUser.id,
        title: 'A Level Biology Revision Guide Chapter 1',
        type: 'PDF',
        url: '/uploads/A Level Biology Revision Guide Chapter 1.pdf',
        createdAt: getPastDate(15)
      }
    ]
  })

  console.log('✉️ Creating Direct Messages...')

  // Message 1: Alex -> Ms. Smith (3 days ago)
  await prisma.directMessage.create({
    data: {
      senderId: studentAlex.id,
      recipientId: teacherUser.id,
      content: 'Hi Ms. Smith, I am struggling with the concept of chemiosmosis. Could you explain it in simpler terms? Thank you.',
      read: true,
      createdAt: getPastDate(3, 16, 0)
    }
  })

  // Reply: Ms. Smith -> Alex (2 days ago)
  await prisma.directMessage.create({
    data: {
      senderId: teacherUser.id,
      recipientId: studentAlex.id,
      content: 'Hi Alex, think of chemiosmosis like water flowing through a turbine. The protons flowing through ATP synthase are like water turning the turbine to generate electricity — except here it generates ATP. Does that analogy help?',
      read: true,
      createdAt: getPastDate(2, 9, 30)
    }
  })

  // Message 2: Ms. Smith broadcast to all 3 students (7 days ago)
  const broadcastContent = 'Class update: Next week session on Enzymes will start 15 minutes earlier at 09:45. Please make note of the change. See you all then!'
  for (const st of enrolledStudents) {
    await prisma.directMessage.create({
      data: {
        senderId: teacherUser.id,
        recipientId: st.id,
        content: broadcastContent,
        read: false,
        createdAt: getPastDate(7, 8, 30)
      }
    })
  }

  console.log('📢 Creating Announcements & Notifications...')

  // Announcement
  await prisma.announcement.create({
    data: {
      subjectId: subject.id,
      authorId: teacherUser.id,
      title: 'Class update: Session start time change',
      content: broadcastContent,
      pinned: true,
      createdAt: getPastDate(7, 8, 30)
    }
  })

  // Notifications for Alex Johnson
  await prisma.notification.createMany({
    data: [
      {
        userId: studentAlex.id,
        type: 'QUIZ_GRADED',
        title: 'Quiz Graded!',
        message: 'Quiz graded: Cell Structure MCQ Test — You scored 90% and earned 95 HELIX points and 5 stars.',
        link: `/dashboard/student/quizzes/${quiz1.id}`,
        createdAt: getPastDate(14, 11, 5)
      },
      {
        userId: studentAlex.id,
        type: 'MEDAL_AWARDED',
        title: '🥇 Gold Medal Awarded!',
        message: '🥇 You topped the class on Cell Structure MCQ Test! Gold medal awarded.',
        link: `/dashboard/student/quizzes/${quiz1.id}`,
        createdAt: getPastDate(14, 11, 6)
      },
      {
        userId: studentAlex.id,
        type: 'QUIZ_GRADED',
        title: 'Quiz Graded!',
        message: 'Quiz graded: Mitochondria & ATP Short Answer Quiz — You scored 80% and earned 80 HELIX points and 4 stars.',
        link: `/dashboard/student/quizzes/${quiz2.id}`,
        createdAt: getPastDate(10, 11, 5)
      },
      {
        userId: studentAlex.id,
        type: 'MEDAL_AWARDED',
        title: '🥈 Silver Medal Awarded!',
        message: '🥈 Second place on Mitochondria Quiz! Silver medal awarded.',
        link: `/dashboard/student/quizzes/${quiz2.id}`,
        createdAt: getPastDate(10, 11, 6)
      },
      {
        userId: studentAlex.id,
        type: 'QUIZ_PUBLISHED',
        title: 'New Quiz Available',
        message: 'New quiz published: DNA & Genetics Assessment — Due in 3 days. 3 questions, 10 marks.',
        link: `/dashboard/student/quizzes/${quiz3.id}`,
        createdAt: getPastDate(1, 9, 0)
      },
      {
        userId: studentAlex.id,
        type: 'CLASS_UPDATE',
        title: 'Class Update from Ms. Smith',
        message: 'Class update from Ms. Smith: Next week session starts 15 minutes earlier at 09:45.',
        link: '/dashboard/student/calendar',
        createdAt: getPastDate(7, 8, 30)
      }
    ]
  })

  // Notifications for Ms. Sarah Smith
  await prisma.notification.createMany({
    data: [
      {
        userId: teacherUser.id,
        type: 'TEACHER_ALERT',
        title: 'Quiz Submissions Complete',
        message: 'All 3 students have submitted Cell Structure MCQ Test. Average score: 82%.',
        link: `/dashboard/teacher/quizzes/${quiz1.id}`,
        createdAt: getPastDate(14, 12, 5)
      },
      {
        userId: teacherUser.id,
        type: 'TEACHER_ALERT',
        title: 'Quiz Submissions Complete',
        message: 'All 3 students have submitted Mitochondria & ATP Quiz. Average score: 75%.',
        link: `/dashboard/teacher/quizzes/${quiz2.id}`,
        createdAt: getPastDate(10, 12, 5)
      },
      {
        userId: teacherUser.id,
        type: 'TEACHER_ALERT',
        title: 'Pending Quiz Submissions',
        message: 'Quiz 3 has 0 of 3 submissions so far — due in 3 days.',
        link: `/dashboard/teacher/quizzes/${quiz3.id}`,
        createdAt: getPastDate(1, 9, 0)
      }
    ]
  })

  // Notifications for Mr. David Johnson (Parent)
  const session4DateStr = dateS4.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const session6DateStr = dateS6.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  await prisma.notification.createMany({
    data: [
      {
        userId: parentUser.id,
        type: 'PARENT_ALERT',
        title: 'Quiz Result: Alex Johnson',
        message: 'Alex Johnson scored 90% on Cell Structure MCQ Test.',
        link: `/dashboard/parent/children/${studentAlex.id}`,
        createdAt: getPastDate(14, 11, 5)
      },
      {
        userId: parentUser.id,
        type: 'PARENT_ALERT',
        title: 'Quiz Result: Alex Johnson',
        message: 'Alex Johnson scored 80% on Mitochondria & ATP Quiz.',
        link: `/dashboard/parent/children/${studentAlex.id}`,
        createdAt: getPastDate(10, 11, 5)
      },
      {
        userId: parentUser.id,
        type: 'PARENT_ALERT',
        title: 'Absence Alert',
        message: `Alex Johnson was absent from Session 4: Protein Synthesis on ${session4DateStr}.`,
        link: `/dashboard/parent/children/${studentAlex.id}`,
        createdAt: getPastDate(5, 11, 0)
      },
      {
        userId: parentUser.id,
        type: 'PARENT_ALERT',
        title: 'New Class Scheduled',
        message: `New class scheduled: Enzymes & Metabolism on ${session6DateStr} at 09:45.`,
        link: `/dashboard/parent/children/${studentAlex.id}`,
      }
    ]
  })

  console.log('📝 Creating Exam Sessions & Exam Records...')

  // Exam Session 1 (Cell Biology End of Topic Test)
  const examSession1Date = getPastDate(21)
  await prisma.examSession.upsert({
    where: { subjectId_title: { subjectId: subject.id, title: 'Cell Biology End of Topic Test' } },
    update: { createdAt: examSession1Date },
    create: {
      subjectId: subject.id,
      title: 'Cell Biology End of Topic Test',
      highlights: 'Strong understanding of cell organelle structures across the batch.',
      lows: 'Some students struggled with organelle magnification calculations.',
      suggestions: 'Add extra practice on microscopy scale conversions.',
      createdAt: examSession1Date
    }
  })

  await prisma.examRecord.deleteMany({
    where: { subjectId: subject.id, title: 'Cell Biology End of Topic Test' }
  })

  const exam1Data = [
    { userId: studentAlex.id, marks: 42, maxMarks: 50, grade: 'A' },
    { userId: studentEmma.id, marks: 38, maxMarks: 50, grade: 'B' },
    { userId: studentRyan.id, marks: 28, maxMarks: 50, grade: 'C' }
  ]

  for (const record of exam1Data) {
    await prisma.examRecord.create({
      data: {
        subjectId: subject.id,
        userId: record.userId,
        title: 'Cell Biology End of Topic Test',
        marks: record.marks,
        maxMarks: record.maxMarks,
        grade: record.grade,
        date: examSession1Date
      }
    })
  }

  // Exam Session 2 (DNA & Genetics Paper)
  const examSession2Date = getPastDate(7)
  await prisma.examSession.upsert({
    where: { subjectId_title: { subjectId: subject.id, title: 'DNA & Genetics Paper' } },
    update: { createdAt: examSession2Date },
    create: {
      subjectId: subject.id,
      title: 'DNA & Genetics Paper',
      highlights: 'Mastery of base pairing rules and double helix structure.',
      lows: 'Semi-conservative replication explanation lacked details on helicase/polymerase roles.',
      suggestions: 'Use interactive diagrams for enzyme functions in replication.',
      createdAt: examSession2Date
    }
  })

  await prisma.examRecord.deleteMany({
    where: { subjectId: subject.id, title: 'DNA & Genetics Paper' }
  })

  const exam2Data = [
    { userId: studentAlex.id, marks: 35, maxMarks: 40, grade: 'A' },
    { userId: studentEmma.id, marks: 30, maxMarks: 40, grade: 'B' },
    { userId: studentRyan.id, marks: 22, maxMarks: 40, grade: 'C' }
  ]

  for (const record of exam2Data) {
    await prisma.examRecord.create({
      data: {
        subjectId: subject.id,
        userId: record.userId,
        title: 'DNA & Genetics Paper',
        marks: record.marks,
        maxMarks: record.maxMarks,
        grade: record.grade,
        date: examSession2Date
      }
    })
  }

  console.log('✅ Seeding completed successfully!')
  console.log('----------------------------------------------------')
  console.log('Linked Test Accounts:')
  console.log(' - Super Admin: admin@helix.test / HelixAdmin2026!')
  console.log(' - Teacher: teacher@helix.test / HelixTeacher2026!')
  console.log(' - Assistant: assistant@helix.test / HelixAssist2026!')
  console.log(' - Student: student@helix.test / HelixStudent2026!')
  console.log(' - Parent: parent@helix.test / HelixParent2026!')
  console.log(' - Student 2: emma@helix.test / HelixTest2026!')
  console.log(' - Student 3: ryan@helix.test / HelixTest2026!')
  console.log('----------------------------------------------------')
}

main()
  .catch(e => {
    console.error('❌ Seeding failed with error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
