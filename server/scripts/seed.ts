import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UserSchema, UserRole, UserStatus } from '../src/modules/users/schemas/user.schema';
import { ProgrammeSchema } from '../src/modules/programmes/schemas/programme.schema';
import { CohortSchema } from '../src/modules/programmes/schemas/cohort.schema';
import { ClassSchema } from '../src/modules/classes/schemas/class.schema';

const SALT_ROUNDS = 12;

async function seed() {
  const uri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/schoolos';
  const dbName = process.env.MONGODB_DB ?? 'schoolos';

  await mongoose.connect(uri, { dbName });

  const UserModel = mongoose.model('User', UserSchema);
  const ProgrammeModel = mongoose.model('Programme', ProgrammeSchema);
  const CohortModel = mongoose.model('Cohort', CohortSchema);
  const ClassModel = mongoose.model('ClassEntity', ClassSchema);

  const adminEmail = 'admin@schoolos.dev';
  const passwordHash = await bcrypt.hash('ChangeMe123!', SALT_ROUNDS);

  await UserModel.findOneAndUpdate(
    { email: adminEmail },
    {
      name: 'SchoolOS Admin',
      role: UserRole.Admin,
      status: UserStatus.Active,
      passwordHash,
    },
    { upsert: true, setDefaultsOnInsert: true },
  );

  const teacherEmail = 'teacher@schoolos.dev';
  const teacherPassword = await bcrypt.hash('Teacher123!', SALT_ROUNDS);
  const teacher = await UserModel.findOneAndUpdate(
    { email: teacherEmail },
    {
      name: 'Sample Teacher',
      role: UserRole.Teacher,
      status: UserStatus.Active,
      passwordHash: teacherPassword,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const studentEmail = 'student@schoolos.dev';
  const studentPassword = await bcrypt.hash('Student123!', SALT_ROUNDS);
  const student = await UserModel.findOneAndUpdate(
    { email: studentEmail },
    {
      name: 'Sample Student',
      role: UserRole.Student,
      status: UserStatus.Active,
      passwordHash: studentPassword,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const programme = await ProgrammeModel.findOneAndUpdate(
    { name: 'Full Stack Programme' },
    { description: 'Sample programme seeded for demos.' },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const cohort = await CohortModel.findOneAndUpdate(
    { programmeId: programme._id, label: 'Autumn 2024' },
    { startAt: new Date(), endAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 120) },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await ClassModel.findOneAndUpdate(
    { title: 'JavaScript Fundamentals' },
    {
      cohortId: cohort._id,
      code: 'JS101',
      instructorIds: [teacher._id],
      scheduleMeta: { day: 'Monday', time: '09:00' },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );

  console.log('Seed completed. Admin login: admin@schoolos.dev / ChangeMe123!');
  console.log('Teacher login: teacher@schoolos.dev / Teacher123!');
  console.log('Student login: student@schoolos.dev / Student123!');

  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error('Seed failed', error);
  process.exitCode = 1;
});
