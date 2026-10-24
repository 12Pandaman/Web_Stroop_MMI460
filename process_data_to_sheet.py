"""
Stroop Data Processor & Sheet Exporter
สคริปต์ประมวลผลข้อมูลการทดลอง Stroop Test จากโฟลเดอร์ data/ หรือไฟล์ CSV ส่งออก
คำนวณ Congruent (ms), Incongruent (ms), ผลต่าง D = I - C และจัดรูปแบบ Pre-test / Post-test
ส่งออกเป็นไฟล์ Excel (.xlsx) และ CSV สำหรับ Google Sheets

Output Sheets:
  1. Stroop_Results  — สรุปรายคน (Cong, Incong, D, Accuracy)
  2. Raw_Trials      — ข้อมูลดิบรายข้อ (Trial, Condition, Prompt Text, Ink Color,
                       User Answer, Correct Answer, Status, RT(s), RT(ms), Is Congruent)
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

# ---------------------------------------------------------------------------
# Column mappings — ปรับตรงนี้ถ้าชื่อ column ใน PsychoPy CSV ต่างออกไป
# ---------------------------------------------------------------------------
COL_WORD        = 'word'                 # คำที่แสดง (Prompt Text)
COL_COLOR       = 'color'               # สีหมึก (Ink Color)
COL_CORR        = 'mouse.corr'          # ถูก/ผิด (1 = ถูก)
COL_TIME        = 'mouse.time'          # Reaction Time (s)
COL_RESP        = 'mouse.clicked_name'  # ปุ่มที่กด (User Answer)
COL_CORR_ANS    = 'corrAns'             # คำตอบที่ถูกต้อง
COL_CONDITION   = 'condition'           # Condition code (C1/C2/…) — optional
COL_PARTICIPANT = 'participant'
COL_SESSION     = 'session'
COL_DATE        = 'date'
# ---------------------------------------------------------------------------

RAW_HEADERS = [
    'Trial', 'Participant', 'Session',
    'Condition', 'Prompt Text', 'Ink Color',
    'User Answer', 'Correct Answer', 'Status',
    'Reaction Time (s)', 'Reaction Time (ms)', 'Is Congruent'
]

STATUS_COLORS = {
    'Correct':   ('D1FAE5', '065F46'),  # เขียว
    'Incorrect': ('FEE2E2', '991B1B'),  # แดง
    'Timeout':   ('FEF3C7', '92400E'),  # เหลือง
}


def _clean(val):
    return (val or '').strip().replace('[', '').replace(']', '')


def _make_border():
    s = Side(style='thin', color='CBD5E1')
    return Border(left=s, right=s, top=s, bottom=s)


def _header_style(cell, bg='334155'):
    cell.fill      = PatternFill(start_color=bg, end_color=bg, fill_type='solid')
    cell.font      = Font(name='Segoe UI', size=10, bold=True, color='FFFFFF')
    cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    cell.border    = _make_border()


def _data_style(cell, align='center'):
    cell.font      = Font(name='Segoe UI', size=10)
    cell.alignment = Alignment(horizontal=align, vertical='center')
    cell.border    = _make_border()


# ---------------------------------------------------------------------------
# Parse PsychoPy CSV — return summary + raw_trials list
# ---------------------------------------------------------------------------
def parse_psychopy_csv(file_path):
    """อ่านไฟล์ CSV จาก PsychoPy และ return dict ที่มีทั้ง summary และ raw_trials"""
    with open(file_path, mode='r', encoding='utf-8-sig', errors='ignore') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    if not rows:
        return None

    participant = rows[0].get(COL_PARTICIPANT, '').strip()
    session     = rows[0].get(COL_SESSION,     '').strip()
    date_str    = rows[0].get(COL_DATE,        '').strip()

    cong_times   = []
    incong_times = []
    total_correct = 0
    total_trials  = 0
    raw_trials    = []

    for trial_no, r in enumerate(rows, start=1):
        word     = _clean(r.get(COL_WORD,  '')).lower()
        color    = _clean(r.get(COL_COLOR, '')).lower()
        corr_val = _clean(r.get(COL_CORR,  ''))
        time_str = _clean(r.get(COL_TIME,  ''))

        if not word or not color or not time_str:
            continue

        try:
            rt_sec = float(time_str)
            rt_ms  = round(rt_sec * 1000)
        except ValueError:
            continue

        is_correct   = (corr_val == '1')
        is_congruent = (word == color)
        total_trials += 1
        if is_correct:
            total_correct += 1
            if is_congruent:
                cong_times.append(rt_ms)
            else:
                incong_times.append(rt_ms)

        # Optional fields
        user_ans  = _clean(r.get(COL_RESP,     '')) or '-'
        corr_ans  = _clean(r.get(COL_CORR_ANS, '')) or color
        cond_code = _clean(r.get(COL_CONDITION, '')) or ('Congruent' if is_congruent else 'Incongruent')
        status    = 'Correct' if is_correct else 'Incorrect'

        raw_trials.append({
            'trial_no':       trial_no,
            'participant':    participant or os.path.basename(file_path).split('_')[0],
            'session':        session or '001',
            'condition':      cond_code,
            'prompt_text':    word,
            'ink_color':      color,
            'user_answer':    user_ans,
            'correct_answer': corr_ans,
            'status':         status,
            'rt_sec':         round(rt_sec, 3),
            'rt_ms':          rt_ms,
            'is_congruent':   'Yes' if is_congruent else 'No',
        })

    if total_trials == 0:
        return None

    cong_avg   = round(sum(cong_times)   / len(cong_times))   if cong_times   else 0
    incong_avg = round(sum(incong_times) / len(incong_times)) if incong_times else 0
    diff_d     = incong_avg - cong_avg
    accuracy   = round((total_correct / total_trials * 100), 1)

    return {
        'participant':    participant or os.path.basename(file_path).split('_')[0],
        'session':        session or '001',
        'date':           date_str,
        'cong_ms':        cong_avg,
        'incong_ms':      incong_avg,
        'diff_d':         diff_d,
        'accuracy':       accuracy,
        'total_trials':   total_trials,
        'correct_trials': total_correct,
        'file':           os.path.basename(file_path),
        'raw_trials':     raw_trials,   # ← ใหม่
    }


def process_all_data(data_dir='data'):
    csv_files = glob.glob(os.path.join(data_dir, '*.csv'))
    results = []
    for fp in sorted(csv_files):
        res = parse_psychopy_csv(fp)
        if res and res['total_trials'] >= 4:
            results.append(res)
    return results


# ---------------------------------------------------------------------------
# Sheet 1: Summary
# ---------------------------------------------------------------------------
def _write_summary_sheet(ws, results):
    ws.title = "Stroop_Results"

    ws.merge_cells('A1:G1')
    ws['A1'] = "ตารางสรุปผลการวิจัย Stroop Task (Congruent vs Incongruent)"
    ws['A1'].font      = Font(name='Segoe UI', size=14, bold=True, color='FFFFFF')
    ws['A1'].fill      = PatternFill(start_color='1E293B', end_color='1E293B', fill_type='solid')
    ws['A1'].alignment = Alignment(horizontal='center', vertical='center')
    ws.row_dimensions[1].height = 36

    ws.merge_cells('A2:G2')
    ws['A2'] = "ข้อมูลคำนวณ Reaction Time เฉพาะข้อที่ตอบถูก (ms) • ผลต่าง D = Incongruent - Congruent"
    ws['A2'].font      = Font(name='Segoe UI', size=9, italic=True, color='64748B')
    ws['A2'].alignment = Alignment(horizontal='center', vertical='center')

    headers = [
        'ผู้เข้าร่วม', 'รอบ/เซสชัน',
        'Congruent (ms)', 'Incongruent (ms)',
        'ผลต่าง D = I - C', 'ความถูกต้อง (%)', 'จำนวนข้อที่ถูก'
    ]
    ws.row_dimensions[4].height = 25
    for col_idx, h in enumerate(headers, start=1):
        _header_style(ws.cell(row=4, column=col_idx, value=h))

    for idx, r in enumerate(results, start=5):
        ws[f'A{idx}'] = r['participant']
        ws[f'B{idx}'] = f"Session {r['session']}"
        ws[f'C{idx}'] = r['cong_ms']
        ws[f'D{idx}'] = r['incong_ms']
        ws[f'E{idx}'] = f'=D{idx}-C{idx}'
        ws[f'F{idx}'] = f"{r['accuracy']}%"
        ws[f'G{idx}'] = f"{r['correct_trials']} / {r['total_trials']}"

        _data_style(ws[f'A{idx}'])
        _data_style(ws[f'B{idx}'])
        _data_style(ws[f'C{idx}'], 'right')
        _data_style(ws[f'D{idx}'], 'right')
        _data_style(ws[f'E{idx}'], 'right')
        _data_style(ws[f'F{idx}'])
        _data_style(ws[f'G{idx}'])
        ws.row_dimensions[idx].height = 22

    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = max(len(str(cell.value or '')) for cell in col)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 15)


# ---------------------------------------------------------------------------
# Sheet 2: Raw Trials ← ใหม่
# ---------------------------------------------------------------------------
def _write_raw_trials_sheet(ws, results):
    ws.title = "Raw_Trials"

    last_col = get_column_letter(len(RAW_HEADERS))
    ws.merge_cells(f'A1:{last_col}1')
    ws['A1'] = "ข้อมูลดิบรายข้อ (Raw Trials) — Stroop Task"
    ws['A1'].font      = Font(name='Segoe UI', size=13, bold=True, color='FFFFFF')
    ws['A1'].fill      = PatternFill(start_color='1E293B', end_color='1E293B', fill_type='solid')
    ws['A1'].alignment = Alignment(horizontal='center', vertical='center')
    ws.row_dimensions[1].height = 32

    ws.row_dimensions[2].height = 26
    for col_idx, h in enumerate(RAW_HEADERS, start=1):
        _header_style(ws.cell(row=2, column=col_idx, value=h), bg='334155')

    row_num = 3
    for r in results:
        for trial in r.get('raw_trials', []):
            status = trial['status']
            bg_hex, fg_hex = STATUS_COLORS.get(status, ('FFFFFF', '1E293B'))

            values = [
                trial['trial_no'],
                trial['participant'],
                f"Session {trial['session']}",
                trial['condition'],
                trial['prompt_text'],
                trial['ink_color'],
                trial['user_answer'],
                trial['correct_answer'],
                status,
                trial['rt_sec'],
                trial['rt_ms'],
                trial['is_congruent'],
            ]
            aligns = ['center','center','center','center','left','left',
                      'left','left','center','right','right','center']

            for col_idx, (val, al) in enumerate(zip(values, aligns), start=1):
                cell = ws.cell(row=row_num, column=col_idx, value=val)
                cell.alignment = Alignment(horizontal=al, vertical='center')
                cell.border    = _make_border()
                if col_idx == 9:  # Status column — สีตาม Correct/Incorrect
                    cell.fill = PatternFill(start_color=bg_hex, end_color=bg_hex, fill_type='solid')
                    cell.font = Font(name='Segoe UI', size=10, bold=True, color=fg_hex)
                else:
                    cell.font = Font(name='Segoe UI', size=10)

            ws.row_dimensions[row_num].height = 20
            row_num += 1

    # Column widths
    col_widths = [8, 14, 12, 14, 14, 12, 14, 16, 11, 16, 16, 13]
    for i, w in enumerate(col_widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    ws.freeze_panes = 'A3'  # Header ติดไว้เมื่อ scroll


# ---------------------------------------------------------------------------
# Export Excel (2 sheets) + CSV summary + CSV raw trials
# ---------------------------------------------------------------------------
def export_summary_excel(results, output_file='Stroop_Processed_Data_Summary.xlsx'):
    wb = openpyxl.Workbook()

    ws_summary = wb.active
    _write_summary_sheet(ws_summary, results)

    ws_raw = wb.create_sheet(title="Raw_Trials")
    _write_raw_trials_sheet(ws_raw, results)

    wb.save(output_file)
    total_raw = sum(len(r.get('raw_trials', [])) for r in results)
    print(f"บันทึกไฟล์ Excel: {output_file}")
    print(f"  ├─ Sheet 'Stroop_Results' : {len(results)} ผู้ทดสอบ")
    print(f"  └─ Sheet 'Raw_Trials'     : {total_raw} แถว (trial-level data)")

    # CSV สรุปรายคน
    csv_summary = output_file.replace('.xlsx', '.csv')
    with open(csv_summary, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['ผู้เข้าร่วม', 'รอบ/เซสชัน', 'Congruent (ms)',
                         'Incongruent (ms)', 'ผลต่าง D = I - C (ms)',
                         'ความถูกต้อง (%)', 'จำนวนข้อที่ถูก'])
        for r in results:
            d_val = r['diff_d']
            d_str = f"+{d_val}" if d_val > 0 else str(d_val)
            writer.writerow([r['participant'], f"Session {r['session']}",
                             r['cong_ms'], r['incong_ms'], d_str,
                             f"{r['accuracy']}%",
                             f"{r['correct_trials']} / {r['total_trials']}"])
    print(f"บันทึก CSV สรุป: {csv_summary}")

    # CSV raw trials รายข้อ ← ใหม่
    csv_raw = output_file.replace('.xlsx', '_RawTrials.csv')
    with open(csv_raw, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(RAW_HEADERS)
        for r in results:
            for trial in r.get('raw_trials', []):
                writer.writerow([
                    trial['trial_no'],
                    trial['participant'],
                    f"Session {trial['session']}",
                    trial['condition'],
                    trial['prompt_text'],
                    trial['ink_color'],
                    trial['user_answer'],
                    trial['correct_answer'],
                    trial['status'],
                    trial['rt_sec'],
                    trial['rt_ms'],
                    trial['is_congruent'],
                ])
    print(f"บันทึก CSV raw trials: {csv_raw}  ({total_raw} แถว)")


if __name__ == '__main__':
    data = process_all_data()
    print(f"พบข้อมูลสมบูรณ์ทั้งหมด: {len(data)} เซสชัน")
    if data:
        export_summary_excel(data)
    else:
        print("ไม่พบไฟล์ CSV ในโฟลเดอร์ data/ — กรุณาตรวจสอบเส้นทางไฟล์")

