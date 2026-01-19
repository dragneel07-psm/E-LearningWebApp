from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academic', '0009_notice_target_student_alter_notice_target_audience'),
    ]

    operations = [
        migrations.AddField(
            model_name='notice',
            name='attachment',
            field=models.FileField(blank=True, help_text='Upload PDF or Image', null=True, upload_to='notices/'),
        ),
    ]
