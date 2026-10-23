"""
Stroop Data Processor & Sheet Exporter
สคริปต์ประมวลผลข้อมูลการทดลอง Stroop Test จากโฟลเดอร์ data/ หรือไฟล์ CSV ส่งออก
คำนวณ Congruent (ms), Incongruent (ms), ผลต่าง D = I - C และจัดรูปแบบ Pre-test / Post-test
ส่งออกเป็นไฟล์ Excel (.xlsx) และ CSV สำหรับ Google Sheets
"""

import os
import sys
import glob
import csv
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def parse_psychopy_csv(file_path):
    """อ่านข้อมูลไฟล์ CSV จาก PsychoPy และคำนวณเวลาเฉลี่ย Congruent & Incongruent"""
    with open(file_path, mode='r', encoding='utf-8-sig', errors='ignore') as f:
        reader = csv.DictReader(f)
        trials = list(reader)

    if not trials:
        return None

    participant = trials[0].get('participant', '').strip()
    session = trials[0].get('session', '').strip()
    date_str = trials[0].get('date', '').strip()

    cong_times = []
    incong_times = []
    total_correct = 0
    total_trials = 0

    for r in trials:
        word = (r.get('word') or '').strip().lower()
        color = (r.get('color') or '').strip().lower()
        corr_val = r.get('mouse.corr', '').strip().replace('[', '').replace(']', '')
        time_str = r.get('mouse.time', '').strip().replace('[', '').replace(']', '')

        if not word or not color or not time_str:
            continue

        try:
            rt_sec = float(time_str)
            rt_ms = round(rt_sec * 1000)
        except ValueError:
            continue

        is_correct = (corr_val == '1')
        total_trials += 1
        if is_correct:
            total_correct += 1

        is_congruent = (word == color)

        # คิดเฉพาะข้อที่ตอบถูก (Correct trials only)
        if is_correct:
            if is_congruent:
                cong_times.append(rt_ms)
            else:
                incong_times.append(rt_ms)

    # คำนวณค่าเฉลี่ย
    cong_avg = round(sum(cong_times) / len(cong_times)) if cong_times else 0
    incong_avg = round(sum(incong_times) / len(incong_times)) if incong_times else 0
    diff_d = incong_avg - cong_avg
    accuracy = round((total_correct / total_trials * 100), 1) if total_trials > 0 else 0.0

    return {
        'participant': participant or os.path.basename(file_path).split('_')[0],
        'session': session or '001',
        'date': date_str,
        'cong_ms': cong_avg,
        'incong_ms': incong_avg,
        'diff_d': diff_d,
        'accuracy': accuracy,
        'total_trials': total_trials,
        'correct_trials': total_correct,
        'file': os.path.basename(file_path)
    }

def process_all_data(data_dir='data'):
    csv_files = glob.glob(os.path.join(data_dir, '*.csv'))
    results = []
    for fp in sorted(csv_files):
        res = parse_psychopy_csv(fp)
        if res and res['total_trials'] >= 4:  # ข้ามไฟล์ทดลองที่ยังทำไม่เสร็จ
            results.append(res)
    return results

def export_summary_excel(results, output_file='Stroop_Processed_Data_Summary.xlsx'):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Stroop_Results"

    # Title
    ws.merge_cells('A1:G1')
    ws['A1'] = "ตารางสรุปผลการวิจัย Stroop Task (Congruent vs Incongruent)"
    ws['A1'].font = Font(name='Segoe UI', size=14, bold=True, color='FFFFFF')
    ws['A1'].fill = PatternFill(start_color='1E293B', end_color='1E293B', fill_type='solid')
    ws['A1'].alignment = Alignment(horizontal='center', vertical='center')
    ws.row_dimensions[1].height = 36

    ws.merge_cells('A2:G2')
    ws['A2'] = "ข้อมูลคำนวณ Reaction Time เฉพาะข้อที่ตอบถูก (ms) • ผลต่าง D = Incongruent - Congruent"
    ws['A2'].font = Font(name='Segoe UI', size=9, italic=True, color='64748B')
    ws['A2'].alignment = Alignment(horizontal='center', vertical='center')

    headers = ['ผู้เข้าร่วม', 'รอบ/เซสชัน', 'Congruent (ms)', 'Incongruent (ms)', 'ผลต่าง D = I - C', 'ความถูกต้อง (%)', 'จำนวนข้อที่ถูก']
    fill_head = PatternFill(start_color='334155', end_color='334155', fill_type='solid')
    font_head = Font(name='Segoe UI', size=10, bold=True, color='FFFFFF')
    border_thin = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    ws.row_dimensions[4].height = 25
    for col_idx, h in enumerate(headers, start=1):
        cell = ws.cell(row=4, column=col_idx, value=h)
        cell.fill = fill_head
        cell.font = font_head
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = border_thin

    for idx, r in enumerate(results, start=5):
        d_val = r['diff_d']
        d_str = f"+{d_val}" if d_val > 0 else str(d_val)

        ws[f'A{idx}'] = r['participant']
        ws[f'B{idx}'] = f"Session {r['session']}"
        ws[f'C{idx}'] = r['cong_ms']
        ws[f'D{idx}'] = r['incong_ms']
        ws[f'E{idx}'] = f'=D{idx}-C{idx}'
        ws[f'F{idx}'] = f"{r['accuracy']}%"
        ws[f'G{idx}'] = f"{r['correct_trials']} / {r['total_trials']}"

        ws[f'A{idx}'].alignment = Alignment(horizontal='center', vertical='center')
        ws[f'B{idx}'].alignment = Alignment(horizontal='center', vertical='center')
        ws[f'C{idx}'].alignment = Alignment(horizontal='right', vertical='center')
        ws[f'D{idx}'].alignment = Alignment(horizontal='right', vertical='center')
        ws[f'E{idx}'].alignment = Alignment(horizontal='right', vertical='center')
        ws[f'F{idx}'].alignment = Alignment(horizontal='center', vertical='center')
        ws[f'G{idx}'].alignment = Alignment(horizontal='center', vertical='center')

        for col_letter in ['A', 'B', 'C', 'D', 'E', 'F', 'G']:
            ws[f'{col_letter}{idx}'].border = border_thin
            ws[f'{col_letter}{idx}'].font = Font(name='Segoe UI', size=10)
        ws.row_dimensions[idx].height = 22

    # Column Widths
    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = max(len(str(cell.value or '')) for cell in col)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 15)

    wb.save(output_file)
    print(f"บันทึกไฟล์สรุป Excel: {output_file} เรียบร้อยแล้ว (รวม {len(results)} ผู้ทดสอบ)")

    # Export CSV version for Google Sheets
    csv_file = output_file.replace('.xlsx', '.csv')
    with open(csv_file, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['ผู้เข้าร่วม', 'รอบ/เซสชัน', 'Congruent (ms)', 'Incongruent (ms)', 'ผลต่าง D = I - C (ms)', 'ความถูกต้อง (%)', 'จำนวนข้อที่ถูก'])
        for r in results:
            d_val = r['diff_d']
            d_str = f"+{d_val}" if d_val > 0 else str(d_val)
            writer.writerow([r['participant'], f"Session {r['session']}", r['cong_ms'], r['incong_ms'], d_str, f"{r['accuracy']}%", f"{r['correct_trials']} / {r['total_trials']}"])
    print(f"บันทึกไฟล์สรุป CSV สำหรับ Google Sheets: {csv_file} เรียบร้อยแล้ว")

if __name__ == '__main__':
    data = process_all_data()
    print(f"พบข้อมูลสมบูรณ์ทั้งหมด: {len(data)} เซสชัน")
    export_summary_excel(data)
