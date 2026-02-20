import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { AppError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

// ─── Register ────────────────────────────────────────────────────────────────

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  organizationName: z.string().min(1),  // Creates org + first user as global admin
});

authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = RegisterSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError(409, 'Email already in use');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const slug = data.organizationName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const org = await prisma.organization.create({
      data: {
        name: data.organizationName,
        slug,
      },
    });

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        isGlobalAdmin: true,   // First user in an org is the admin
        organizationId: org.id,
        personalWorkspace: {
          create: {
            name: `${data.firstName}'s Workspace`,
            isPersonal: true,
            organizationId: org.id,
          },
        },
      },
    });

    const token = signToken({ userId: user.id, organizationId: org.id, isGlobalAdmin: true });
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

// ─── Login ───────────────────────────────────────────────────────────────────

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = LoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new AppError(401, 'Invalid email or password');

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) throw new AppError(401, 'Invalid email or password');

    const token = signToken({
      userId: user.id,
      organizationId: user.organizationId,
      isGlobalAdmin: user.isGlobalAdmin,
    });
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

// ─── Me (get current user) ───────────────────────────────────────────────────

authRouter.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId } });
    res.json(sanitizeUser(user));
  } catch (err) {
    next(err);
  }
});

// ─── Update own profile (name + optional password change) ────────────────────

const UpdateMeSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
}).refine(
  (d) => !(d.newPassword && !d.currentPassword),
  { message: 'currentPassword is required to set a new password' }
);

authRouter.patch('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = UpdateMeSchema.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId } });

    let passwordHash: string | undefined;
    if (data.newPassword) {
      const valid = await bcrypt.compare(data.currentPassword!, user.passwordHash);
      if (!valid) throw new AppError(400, 'Current password is incorrect');
      passwordHash = await bcrypt.hash(data.newPassword, 12);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.firstName ? { firstName: data.firstName } : {}),
        ...(data.lastName  ? { lastName:  data.lastName  } : {}),
        ...(passwordHash   ? { passwordHash }               : {}),
      },
    });

    res.json(sanitizeUser(updated));
  } catch (err) {
    next(err);
  }
});

// Strip the password hash before sending user data to the client
function sanitizeUser(user: { id: string; email: string; passwordHash: string; firstName: string; lastName: string; isGlobalAdmin: boolean; createdAt: Date; updatedAt: Date; organizationId: string }) {
  const { passwordHash: _omit, ...safe } = user;
  return safe;
}
