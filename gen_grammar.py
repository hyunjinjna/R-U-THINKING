# -*- coding: utf-8 -*-
# 문법 영역 12단계 × 4문항 = 48문항
# 단계 매핑: 1-3 My First Grammar 1·2·3 / 4-6 다음 시리즈 1·2·3 / 7-9 / 10-12 (교재 순서: My First → Best → Next → Plus)
# 문항 유형: 빈칸 3개 + 오류찾기 1개(각 단계) — 오류찾기는 "정답 = 틀린 문장", 오답 태그 전부 오류찾기부족
# 태그: 형태변화규칙미숙지(틀린 형태) / 시제구분부족(시간 단서 무시) / 규칙적용부족(규칙을 알아도 적용 실패) / 문장구조이해부족(자리·어순 오류)
import openpyxl
from openpyxl.styles import Font

MAPPING = [
 (1,  "be동사 (am/is/are) · 인칭대명사 주격"),
 (2,  "명사 단수·복수 · 관사 a/an · 지시사 this/that/these/those"),
 (3,  "일반동사 현재형 · 3인칭 단수 -s · Do/Does 의문문"),
 (4,  "현재진행형 · 목적격 대명사"),
 (5,  "조동사 can · 명령문 · 소유격"),
 (6,  "be동사 과거 (was/were) · 규칙동사 과거형"),
 (7,  "불규칙동사 과거형 · 미래 will"),
 (8,  "비교급 · 최상급 · 부사 (-ly)"),
 (9,  "현재완료 기초 (have + p.p.) · 접속사 (and/but/so/because)"),
 (10, "수동태 기초 · to부정사 / 동명사 (enjoy -ing, hope to)"),
 (11, "관계대명사 (who/which/that) · 시제 일치"),
 (12, "조건문 (If + 현재) · 간접의문문 어순"),
]

ERR = "Choose the sentence that is NOT correct."

# (단계, 문장, 정답, [(오답, 태그) x3])  — 오류찾기는 문장=ERR, 정답=틀린 문장, 오답=맞는 문장(태그 오류찾기부족)
Q = [
# ===== 1단계: be동사·인칭대명사 =====
(1, 'I _____ a student.', 'am', [('is','규칙적용부족'),('be','형태변화규칙미숙지'),('do','문장구조이해부족')]),
(1, 'This is my sister. _____ is very kind.', 'She', [('Her','형태변화규칙미숙지'),('He','규칙적용부족'),('Is','문장구조이해부족')]),
(1, 'They _____ my best friends.', 'are', [('is','규칙적용부족'),('am','형태변화규칙미숙지'),('do','문장구조이해부족')]),
(1, ERR, 'He are my brother.', [('I am happy.','오류찾기부족'),('You are tall.','오류찾기부족'),('We are students.','오류찾기부족')]),
# ===== 2단계: 명사·관사·지시사 =====
(2, 'I eat _____ apple every morning.', 'an', [('a','규칙적용부족'),('two','문장구조이해부족'),('much','문장구조이해부족')]),
(2, 'Look at _____ birds in the sky!', 'those', [('that','규칙적용부족'),('this','규칙적용부족'),('them','문장구조이해부족')]),
(2, 'There are three _____ on the desk.', 'books', [('book','규칙적용부족'),('bookes','형태변화규칙미숙지'),('reading','문장구조이해부족')]),
(2, ERR, 'She has two cat.', [('I have a dog.','오류찾기부족'),('He has an egg.','오류찾기부족'),('We have many toys.','오류찾기부족')]),
# ===== 3단계: 일반동사 현재·3단현 =====
(3, 'My dad _____ to work every day.', 'goes', [('go','규칙적용부족'),('goed','형태변화규칙미숙지'),('going','문장구조이해부족')]),
(3, 'We _____ TV together every evening.', 'watch', [('watches','규칙적용부족'),('watched','시제구분부족'),('watching','문장구조이해부족')]),
(3, '_____ your brother like pizza?', 'Does', [('Do','규칙적용부족'),('Is','문장구조이해부족'),('Did','시제구분부족')]),
(3, ERR, "He don't like carrots.", [('She likes music.','오류찾기부족'),('They play soccer.','오류찾기부족'),('I want some water.','오류찾기부족')]),
# ===== 4단계: 현재진행·목적격 =====
(4, 'Look! The baby _____ now.', 'is sleeping', [('sleeps','시제구분부족'),('is sleep','형태변화규칙미숙지'),('sleeping','문장구조이해부족')]),
(4, 'Mom is calling you. Can you answer _____?', 'her', [('she','형태변화규칙미숙지'),('hers','규칙적용부족'),('him','규칙적용부족')]),
(4, 'They _____ soccer in the park right now.', 'are playing', [('play','시제구분부족'),('are play','형태변화규칙미숙지'),('playing','문장구조이해부족')]),
(4, ERR, 'She is watch TV now.', [('I am doing my homework.','오류찾기부족'),('He is running fast.','오류찾기부족'),('They are eating lunch.','오류찾기부족')]),
# ===== 5단계: can·명령문·소유격 =====
(5, "A fish _____ swim, but it can't walk.", 'can', [('cans','형태변화규칙미숙지'),('is','문장구조이해부족'),('to','문장구조이해부족')]),
(5, '_____ quiet in the library, please.', 'Be', [('Is','형태변화규칙미숙지'),('You','문장구조이해부족'),('Being','규칙적용부족')]),
(5, 'That is _____ bike, not yours.', 'my', [('me','형태변화규칙미숙지'),('I','문장구조이해부족'),('mine','규칙적용부족')]),
(5, ERR, 'This is hers book.', [('That is my pencil.','오류찾기부족'),('This is our house.','오류찾기부족'),('These are his shoes.','오류찾기부족')]),
# ===== 6단계: 과거 be·규칙동사 =====
(6, 'I _____ at home yesterday.', 'was', [('am','시제구분부족'),('were','규칙적용부족'),('did','문장구조이해부족')]),
(6, 'She _____ her room last Saturday.', 'cleaned', [('cleans','시제구분부족'),('cleanned','형태변화규칙미숙지'),('is clean','문장구조이해부족')]),
(6, 'We _____ very happy at the party last night.', 'were', [('are','시제구분부족'),('was','규칙적용부족'),('be','형태변화규칙미숙지')]),
(6, ERR, 'They was late for school.', [('I was sick yesterday.','오류찾기부족'),('She was at the park.','오류찾기부족'),('We were very tired.','오류찾기부족')]),
# ===== 7단계: 불규칙 과거·미래 will =====
(7, 'Yesterday, Tom _____ his key on the bus.', 'lost', [('losed','형태변화규칙미숙지'),('loses','시제구분부족'),('lose','규칙적용부족')]),
(7, "Don't worry. I _____ help you tomorrow.", 'will', [('wills','형태변화규칙미숙지'),('am','문장구조이해부족'),('did','시제구분부족')]),
(7, 'She _____ a letter to her grandma last week.', 'wrote', [('writed','형태변화규칙미숙지'),('writes','시제구분부족'),('writing','문장구조이해부족')]),
(7, ERR, 'We goed to the beach last summer.', [('He came home early.','오류찾기부족'),('I saw a rainbow yesterday.','오류찾기부족'),('She made a cake for me.','오류찾기부족')]),
# ===== 8단계: 비교급·최상급·부사 =====
(8, 'An elephant is _____ than a horse.', 'bigger', [('big','규칙적용부족'),('biggest','규칙적용부족'),('more big','형태변화규칙미숙지')]),
(8, 'This is the _____ movie of the year.', 'best', [('better','규칙적용부족'),('good','규칙적용부족'),('goodest','형태변화규칙미숙지')]),
(8, 'Please walk _____. The floor is wet.', 'carefully', [('careful','형태변화규칙미숙지'),('care','문장구조이해부족'),('carefuly','형태변화규칙미숙지')]),
(8, ERR, 'Math is more easy than science.', [('Today is hotter than yesterday.','오류찾기부족'),('This is the tallest building here.','오류찾기부족'),('She runs faster than me.','오류찾기부족')]),
# ===== 9단계: 현재완료·접속사 =====
(9, 'She has _____ in Seoul since 2020.', 'lived', [('live','형태변화규칙미숙지'),('living','문장구조이해부족'),('lives','규칙적용부족')]),
(9, '_____ you ever seen a whale?', 'Have', [('Did','시제구분부족'),('Do','시제구분부족'),('Has','규칙적용부족')]),
(9, 'I was tired, _____ I went to bed early.', 'so', [('but','문장구조이해부족'),('because','문장구조이해부족'),('or','문장구조이해부족')]),
(9, ERR, 'He has went to London twice.', [('I have finished my homework.','오류찾기부족'),('She has lost her umbrella.','오류찾기부족'),('We have known him for years.','오류찾기부족')]),
# ===== 10단계: 수동태·to부정사/동명사 =====
(10, 'This song _____ by a famous singer in 1990.', 'was written', [('wrote','문장구조이해부족'),('was wrote','형태변화규칙미숙지'),('is written','시제구분부족')]),
(10, 'I enjoy _____ books on rainy days.', 'reading', [('to read','규칙적용부족'),('read','문장구조이해부족'),('reads','문장구조이해부족')]),
(10, 'She hopes _____ a doctor someday.', 'to become', [('becoming','규칙적용부족'),('become','문장구조이해부족'),('became','시제구분부족')]),
(10, ERR, 'The window was break by the wind.', [('The room was cleaned this morning.','오류찾기부족'),('This book was written in English.','오류찾기부족'),('The cookies were made by my mom.','오류찾기부족')]),
# ===== 11단계: 관계대명사·시제 일치 =====
(11, 'I have a friend _____ speaks four languages.', 'who', [('which','규칙적용부족'),('whom','형태변화규칙미숙지'),('what','문장구조이해부족')]),
(11, 'She said that she _____ busy that day.', 'was', [('is','시제구분부족'),('be','형태변화규칙미숙지'),('been','문장구조이해부족')]),
(11, 'The cake _____ my mom made was delicious.', 'that', [('who','규칙적용부족'),('what','규칙적용부족'),('it','문장구조이해부족')]),
(11, ERR, 'This is the boy which won the contest.', [('I like the song that you sang.','오류찾기부족'),('She is the teacher who helped me.','오류찾기부족'),('This is the house that Jack built.','오류찾기부족')]),
# ===== 12단계: 조건문·간접의문문 =====
(12, 'If it _____ tomorrow, we will stay home.', 'rains', [('will rain','규칙적용부족'),('rained','시제구분부족'),('raining','문장구조이해부족')]),
(12, 'Do you know where _____?', 'she lives', [('does she live','문장구조이해부족'),('she live','규칙적용부족'),('lives she','문장구조이해부족')]),
(12, 'Could you tell me what time _____?', 'it is', [('is it','문장구조이해부족'),('it be','형태변화규칙미숙지'),('does it','문장구조이해부족')]),
(12, ERR, "I don't know why did he leave early.", [('I wonder where she went.','오류찾기부족'),('Do you know who he is?','오류찾기부족'),('Tell me when the movie starts.','오류찾기부족')]),
]

# 검증
levels = {}
for lv, s, ans, ds in Q:
    levels[lv] = levels.get(lv, 0) + 1
    if s != ERR:
        assert '_____' in s, s
    words = [ans] + [d[0] for d in ds]
    assert len(set(w.lower() for w in words)) == 4, s
assert len(levels) == 12 and all(v == 4 for v in levels.values()), levels

wb = openpyxl.Workbook()
ws = wb.active
ws.title = '문법'
cols = ['문제ID','난이도(1-12)','문장(빈칸포함)','보기1','보기2','보기3','보기4','정답번호','보기1구멍','보기2구멍','보기3구멍','보기4구멍']
ws.append(cols)
for c in ws[1]: c.font = Font(name='Arial', bold=True)

counter = {}
pos = 0
for lv, sent, ans, ds in Q:
    counter[lv] = counter.get(lv, 0) + 1
    qid = f"GRAM-{lv:02d}-{counter[lv]:03d}"
    answer_idx = pos % 4
    pos += 1
    opts = [None]*4; tags = ['']*4
    opts[answer_idx] = ans
    di = 0
    for i in range(4):
        if opts[i] is None:
            opts[i] = ds[di][0]; tags[i] = ds[di][1]; di += 1
    ws.append([qid, lv, sent] + opts + [answer_idx+1] + tags)
for row in ws.iter_rows(min_row=2):
    for c in row: c.font = Font(name='Arial')
ws.column_dimensions['C'].width = 50
ws.column_dimensions['A'].width = 15
for col in ['D','E','F','G']: ws.column_dimensions[col].width = 22

# 매핑 탭 (검토용 — 붙여넣기 대상 아님)
ws2 = wb.create_sheet('단계매핑(검토용)')
ws2.append(['난이도','문법 항목'])
for c in ws2[1]: c.font = Font(name='Arial', bold=True)
for lv, topic in MAPPING:
    ws2.append([lv, topic])
for row in ws2.iter_rows(min_row=2):
    for c in row: c.font = Font(name='Arial')
ws2.column_dimensions['B'].width = 60

wb.save('/mnt/user-data/outputs/문법_문제은행_48문항.xlsx')

from collections import Counter
apos = Counter(); tcnt = Counter()
for r in ws.iter_rows(min_row=2, values_only=True):
    apos[r[7]] += 1
    for t in r[8:12]:
        if t: tcnt[t] += 1
print('문항 수:', ws.max_row - 1)
print('정답 위치 분포:', dict(sorted(apos.items())))
print('구멍 태그 분포:', dict(tcnt))
