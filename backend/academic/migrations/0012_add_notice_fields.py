from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academic', '0011_alter_notice_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='notice',
            name='category',
            field=models.CharField(default='General', max_length=50),
        ),
        migrations.AddField(
            model_name='notice',
            name='priority',
            field=models.CharField(choices=[('low', 'Low'), ('normal', 'Normal'), ('high', 'High')], default='normal', max_length=20),
        ),
        migrations.AddField(
            model_name='notice',
            name='expiry_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='notice',
            name='attachment',
            field=models.FileField(blank=True, help_text='Upload PDF or Image', null=True, upload_to='notices/'),
        ),
    ]
