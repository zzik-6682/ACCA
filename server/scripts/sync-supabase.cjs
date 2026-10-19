const postgres = require('postgres');

const sql = postgres(process.env.PGDATABASE_URL, { max: 1, ssl: 'require' });

(async () => {
  const recs = require('/tmp/ecs_final.json');
  console.log('待同步记录数:', recs.length);

  try {
    await sql.begin(async (tx) => {
      // 1. 备份现有数据（固定表名，重复执行先删）
      await tx`DROP TABLE IF EXISTS exam_records_backup_prev`;
      await tx`CREATE TABLE exam_records_backup_prev AS TABLE exam_records`;
      const backupCnt = await tx`SELECT count(*)::int AS n FROM exam_records_backup_prev`;
      console.log('已备份旧数据:', backupCnt[0].n, '条 -> exam_records_backup_prev');

      // 2. 清空并全量插入
      await tx`DELETE FROM exam_records`;
      console.log('已清空 exam_records');

      const toBool = (v) => v === true || v === 't' || v === true;
      const rows = recs.map((r) => [
        String(r.id),
        String(r.student_id),
        r.subject_name,
        r.subject_code,
        r.score === null || r.score === '' ? null : Number(r.score),
        toBool(r.pass_status),
        r.exam_season,
        r.exam_type || 'global_exam',
        r.screenshot_key || null,
        r.notes || null,
        r.created_at ? new Date(r.created_at + '+08:00') : new Date(),
        r.updated_at ? new Date(r.updated_at + '+08:00') : null,
      ]);

      await tx`
        INSERT INTO exam_records
          (id, student_id, subject_name, subject_code, score, pass_status,
           exam_season, exam_type, screenshot_key, notes, created_at, updated_at)
        VALUES ${sql(rows)}
      `;
      console.log('已插入新数据:', rows.length, '条');
    });

    // 验证
    const after = await sql`SELECT count(*)::int AS n FROM exam_records`;
    console.log('\n同步后 exam_records 总数:', after[0].n);

    const distinct = await sql`SELECT count(DISTINCT student_id)::int AS n FROM exam_records`;
    console.log('涉及学生数:', distinct[0].n);

    const cao = await sql`
      SELECT er.subject_code, er.score, er.exam_season, s.name
      FROM exam_records er JOIN students s ON s.id = er.student_id
      WHERE s.name = '曹雨欣' ORDER BY er.subject_code, er.exam_season
    `;
    console.log('\n=== 曹雨欣记录 ===');
    cao.forEach((r) => console.log(`${r.subject_code} | ${r.score}分 | ${r.exam_season}`));
  } catch (e) {
    console.error('同步失败:', e.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
})();
