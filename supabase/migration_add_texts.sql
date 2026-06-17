-- اجرا کن توی SQL Editor سوپابیس برای فعال کردن ذخیره متون در پنل ادمین
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS texts JSONB DEFAULT '{}'::jsonb;
