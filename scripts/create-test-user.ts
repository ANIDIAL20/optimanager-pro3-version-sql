import { db } from '../src/db/index';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function createTestUser() {
  console.log('🔧 Cleaning up and creating fresh test user...');
  
  const email = 'demo@optimanager.com'; // إيميل جديد
  const password = '123456';            // مودباس ساهل
  
  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  try {
    // 1. نمسحو المستخدم القديم باش مايوقعش تضارب (Nettoyage)
    await db.delete(users).where(eq(users.email, email));
    console.log('🧹 Cleaned up old test user if existed.');

    // 2. نكرييو المستخدم الجديد
    const [newUser] = await db.insert(users).values({
      email,
      password: hashedPassword,
      name: 'Demo User',
      role: 'user', // أو دير 'admin' إلا بغيتي تجرب بصلاحيات الأدمين
      emailVerified: new Date(),
    }).returning();
    
    console.log('✅ New User Created Successfully!');
    console.log('--------------------------------');
    console.log('📧 Email:   ', email);
    console.log('🔑 Password:', password);
    console.log('🆔 ID:      ', newUser.id);
    console.log('--------------------------------');
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
  }
  
  process.exit(0);
}

createTestUser();
