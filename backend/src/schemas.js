const { z } = require('zod');

const roleEnum = z.enum(['USER', 'SUPER_ADMIN']);

const criteriaItemSchema = z
  .object({
    title: z.string().min(1),
    desc: z.string().min(1),
    max: z.number().int().positive(),
    score: z.number().int().min(0),
  })
  .refine((item) => item.score <= item.max, {
    message: '评分不能超过单项满分',
    path: ['score'],
  });

const submissionSchema = z.object({
  lessonDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '授课日期格式不正确'),
  round: z.string().trim().optional().default(''),
  highlights: z.string().trim().optional().default(''),
  suggestions: z.string().trim().optional().default(''),
  criteria: z.array(criteriaItemSchema).min(1, '评分项不能为空'),
});

const loginSchema = z.object({
  username: z.string().trim().min(1, '请输入账号'),
  password: z.string().trim().min(1, '请输入密码'),
});

const lessonSettingsSchema = z
  .object({
    currentTeacher: z.string().trim().default(''),
    currentTopic: z.string().trim().default(''),
    currentSubject: z.string().trim().default(''),
    currentRound: z.string().trim().default(''),
    scoringEnabled: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (!value.scoringEnabled) {
      return;
    }

    if (!value.currentTeacher) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '请填写当前讲课老师',
        path: ['currentTeacher'],
      });
    }

    if (!value.currentTopic) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '请填写当前讲课内容',
        path: ['currentTopic'],
      });
    }

    if (!value.currentSubject) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '请填写当前讲课科目',
        path: ['currentSubject'],
      });
    }

    if (!value.currentRound) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '请填写当前讲课场次',
        path: ['currentRound'],
      });
    }
  });

const criteriaConfigItemSchema = z.object({
  title: z.string().trim().min(1, '请填写评分细则标题'),
  desc: z.string().trim().min(1, '请填写评分细则说明'),
  max: z.number().int().positive('评分满分必须大于 0'),
});

const criteriaConfigSchema = z
  .array(criteriaConfigItemSchema)
  .min(1, '至少保留一条评分细则');

const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, '账号至少 3 个字符')
    .max(32, '账号最多 32 个字符')
    .regex(/^[a-zA-Z0-9_\-.]+$/, '账号仅支持字母、数字、下划线、中划线和点'),
  displayName: z.string().trim().min(1, '请填写姓名'),
  password: z.string().trim().min(6, '密码至少 6 位'),
  role: roleEnum.default('USER'),
});

const updateUserSchema = z.object({
  displayName: z.string().trim().min(1, '请填写姓名').optional(),
  password: z.string().trim().min(6, '密码至少 6 位').optional(),
  role: roleEnum.optional(),
});

module.exports = {
  criteriaConfigSchema,
  createUserSchema,
  lessonSettingsSchema,
  loginSchema,
  submissionSchema,
  updateUserSchema,
};
