# -*- coding: utf-8 -*-
# 리딩 영역 렉사일 7구간 × 4문항 = 28문항 (지문+질문 창작)
# 리딩 방식: 문제유형 = 구멍 1:1 — 오답 보기의 구멍은 전부 그 문항의 문제유형과 동일, 정답은 빈칸 (기존 샘플 방식)
# 질문은 한국어, 지문은 영어. 지문 길이는 60초 타이머 안에 읽히도록 구간별 계단.
# 구간 대표 렉사일: 120 / 260 / 330 / 430 / 550 / 750 / 900
import openpyxl
from openpyxl.styles import Font

# (렉사일, 문제유형태그, 지문, 질문, 정답, [오답3])
Q = [
# ===== 0~240L (대표 120) — 짧은 문장 2~3개, 현재시제 =====
(120, '세부사항파악부족',
 'I have a cat. My cat is white. It likes milk.',
 '고양이는 무슨 색인가요?', 'white', ['black','brown','red']),
(120, '어휘부족',
 'Ben is happy. He smiles and jumps.',
 "글의 'happy'와 뜻이 비슷한 말은?", 'glad', ['sad','angry','tired']),
(120, '세부사항파악부족',
 'This is my school. I go to school with my friend Amy.',
 '나는 누구와 학교에 가나요?', 'Amy', ['Ben','Mom','Tom']),
(120, '주제요지파악부족',
 'I like apples. I like bananas. I like grapes. Fruit is good!',
 '무엇에 대한 글인가요?', '좋아하는 과일', ['싫어하는 음식','우리 가족','내 장난감']),
# ===== 240~280L (대표 260) =====
(260, '세부사항파악부족',
 'Sam has a small dog. Its name is Coco. Every morning, they walk in the park.',
 'Sam은 아침마다 무엇을 하나요?', '공원에서 산책한다', ['수영을 한다','책을 읽는다','요리를 한다']),
(260, '어휘부족',
 'Winter is very cold. We wear warm coats and hats.',
 "글의 'cold'와 뜻이 반대인 말은?", 'hot', ['big','slow','wet']),
(260, '지시어이해부족',
 'Mia has a red bike. She rides it to school every day.',
 "글에서 'it'이 가리키는 것은?", 'the bike', ['Mia','the school','every day']),
(260, '주제요지파악부족',
 'Lily gets up early. She brushes her teeth. She eats breakfast. Then she goes to school.',
 '무엇에 대한 글인가요?', 'Lily의 아침', ['Lily의 친구','학교 수업','저녁 식사']),
# ===== 280~380L (대표 330) =====
(330, '세부사항파악부족',
 'Ants live together in big groups. Some ants find food. Other ants take care of the babies. Every ant has a job.',
 '글의 내용과 맞는 것은?', '개미는 모두 자기 일이 있다', ['개미는 혼자 산다','개미는 일을 하지 않는다','개미는 밤에만 먹는다']),
(330, '문맥추론부족',
 "It rained all day. The ground was wet and _____. Tom's shoes got dirty.",
 '빈칸에 들어갈 말로 알맞은 것은?', 'muddy', ['dry','clean','sunny']),
(330, '지시어이해부족',
 'Grandpa gave Jenny a book. She read it every night before bed. It made her sleepy and happy.',
 "글에서 'it'이 가리키는 것은?", 'the book', ['Grandpa','Jenny','the bed']),
(330, '원인결과추론부족',
 'Ben forgot his umbrella. It started to rain on his way home. When he got home, he was all wet.',
 'Ben이 흠뻑 젖은 이유는?', '우산을 안 가져가서', ['수영을 해서','샤워를 해서','물을 쏟아서']),
# ===== 400~460L (대표 430) =====
(430, '주제요지파악부족',
 'Bees are amazing insects. They fly from flower to flower to collect nectar. Back at their home, they turn the nectar into sweet honey. People have enjoyed honey for thousands of years.',
 '이 글의 주제는?', '벌이 꿀을 만드는 과정', ['꽃을 기르는 방법','곤충의 생김새','사람들의 아침 식사']),
(430, '문맥추론부족',
 'The library was about to close. Emma quickly picked three books and _____ to the front desk. She did not want to be late.',
 '빈칸에 들어갈 말로 알맞은 것은?', 'hurried', ['waited','wandered','relaxed']),
(430, '원인결과추론부족',
 'Maya practiced the piano every day for a month. At the school concert, she played without any mistakes. Everyone clapped loudly.',
 'Maya가 실수 없이 연주할 수 있었던 이유는?', '매일 연습해서', ['운이 좋아서','곡이 쉬워서','선생님이 대신 쳐서']),
(430, '세부사항파악부족',
 'The Amazon River is in South America. It carries more water than any other river in the world. Many fish, birds, and animals live near it.',
 '아마존 강은 어디에 있나요?', 'South America', ['Africa','Asia','Europe']),
# ===== 500~610L (대표 550) =====
(550, '문맥추론부족',
 "Sea turtles return to the same beach where they were born to lay their eggs. Scientists believe the turtles use the Earth's magnetic field like a _____ to find their way across thousands of kilometers of ocean.",
 '빈칸에 들어갈 말로 알맞은 것은?', 'map', ['blanket','mirror','ladder']),
(550, '원인결과추론부족',
 'In 1666, a small fire started in a bakery in London. The buildings were made of wood and stood very close together, so the fire spread quickly. Within days, most of the city was destroyed.',
 '불이 빠르게 번진 이유는?', '나무 건물들이 서로 붙어 있어서', ['비가 많이 와서','도시에 사람이 없어서','강이 가까이 있어서']),
(550, '문장구조이해부족',
 'The letter that Grandma sent to my brother last week finally arrived this morning.',
 '편지를 보낸 사람은 누구인가요?', 'Grandma', ['my brother','the mail carrier','I']),
(550, '지시어이해부족',
 'Dolphins use special sounds to talk to each other. Each dolphin has its own whistle, like a name. When a dolphin hears it, the animal answers right away.',
 "마지막 문장의 'it'이 가리키는 것은?", 'its own whistle', ['the ocean','the dolphin','the answer']),
# ===== 670~830L (대표 750) =====
(750, '주제요지파악부족',
 "For hundreds of years, people believed that tomatoes were poisonous. Rich Europeans often became sick after eating them — but the real cause was their pewter plates, which contained lead. The acid in tomatoes pulled the lead out of the plates. The poor, who ate from wooden plates, enjoyed tomatoes safely. Over time, the fruit's bad reputation slowly disappeared.",
 '이 글의 주제는?', '토마토가 위험하다고 오해받은 이유', ['토마토를 기르는 방법','유럽 부자들의 식사 예절','나무 접시의 장점']),
(750, '문장구조이해부족',
 'Standing at the door was a tall man whom nobody in the village had ever seen before.',
 '문 앞에 서 있던 것은?', 'a tall man', ['the village','nobody','the door']),
(750, '순서구조파악부족',
 'First, the chef mixes flour and water into dough. Next, the dough rests for an hour so it can rise. After that, it is shaped into loaves. Finally, the loaves are baked until golden.',
 '글의 흐름으로 알맞은 순서는?', '반죽 만들기 → 휴지 → 모양 만들기 → 굽기', ['굽기 → 반죽 만들기 → 휴지 → 모양 만들기','휴지 → 굽기 → 반죽 만들기 → 모양 만들기','모양 만들기 → 반죽 만들기 → 굽기 → 휴지']),
(750, '어조의도파악부족',
 'Another Monday. The alarm rang for the third time, and Jake pulled the blanket over his head. School could wait five more minutes — or maybe fifty.',
 '글에 나타난 Jake의 마음은?', '학교에 가기 싫다', ['학교가 몹시 기대된다','알람이 고장 나서 걱정된다','월요일 아침을 좋아한다']),
# ===== 860~950L (대표 900) =====
(900, '문맥추론부족',
 'The ancient city of Pompeii was buried under volcanic ash in 79 AD. Ironically, the very disaster that destroyed the city also _____ it: the ash sealed buildings, paintings, and even loaves of bread from air and moisture, keeping them almost unchanged for nearly two thousand years.',
 '빈칸에 들어갈 말로 알맞은 것은?', 'preserved', ['expanded','modernized','emptied']),
(900, '순서구조파악부족',
 'Many people assume that all deserts are hot. In fact, the largest desert on Earth is Antarctica. A desert is defined not by temperature but by how little rain falls. By that measure, the icy continent, which receives almost no precipitation, easily qualifies.',
 '이 글의 전개 방식은?', '흔한 오해를 제시하고 바로잡는다', ['시간 순서로 사건을 나열한다','두 인물을 비교한다','실험 과정을 단계별로 설명한다']),
(900, '어조의도파악부족',
 "The 'revolutionary' new phone, according to the advertisement, would change my life forever. Three weeks later, it sits in my drawer — a very expensive way to check the weather.",
 '글쓴이의 어조로 알맞은 것은?', '비꼬는 듯하다', ['들떠 있다','두려워한다','자랑스러워한다']),
(900, '문장구조이해부족',
 'Had the explorers known how harsh the winter would be, they would never have left the safety of the coast.',
 '이 문장의 의미로 알맞은 것은?', '탐험가들은 겨울이 혹독할 줄 몰랐다', ['탐험가들은 해안을 떠나지 않았다','그해 겨울은 따뜻했다','탐험가들은 겨울 날씨를 미리 알고 있었다']),
# ===== 유형 보강 (구간마다 레벨에 맞는 유형 전부 커버) =====
(120, '지시어이해부족',
 'This is my dog. It is big and brown.',
 "글에서 'It'이 가리키는 것은?", 'my dog', ['my cat','my house','the park']),
(120, '문맥추론부족',
 'It is snowing. I am cold. I put on my warm _____.',
 '빈칸에 들어갈 말로 알맞은 것은?', 'coat', ['swimsuit','sunglasses','fan']),
(260, '문맥추론부족',
 'Tom is very tired. He goes to his room and _____.',
 '빈칸에 들어갈 말로 알맞은 것은?', 'sleeps', ['runs','sings','cooks']),
(260, '원인결과추론부족',
 'Amy watered her plant every day. Now it is tall and green.',
 '식물이 잘 자란 이유는?', '매일 물을 줘서', ['방이 어두워서','물을 안 줘서','겨울이라서']),
(330, '주제요지파악부족',
 'Rabbits have long ears. They can hear very well. Their strong back legs help them jump high and run fast.',
 '무엇에 대한 글인가요?', '토끼 몸의 특징', ['토끼가 먹는 것','토끼를 기르는 방법','동물원의 하루']),
(330, '어휘부족',
 'The box was very heavy. Dad could not lift it alone.',
 "글의 'heavy'와 뜻이 반대인 말은?", 'light', ['small','long','fast']),
(430, '어휘부족',
 'The desert is an arid place. It almost never rains there, and few plants can grow.',
 "글의 'arid'와 뜻이 가장 가까운 것은?", 'dry', ['wet','crowded','noisy']),
(430, '지시어이해부족',
 'Penguins cannot fly, but they are great swimmers. They use their wings like flippers. This helps them move fast under water.',
 "글에서 'This'가 가리키는 것은?", '날개를 지느러미처럼 쓰는 것', ['날 수 없다는 것','물이 차갑다는 것','펭귄의 부리 모양']),
(550, '주제요지파악부족',
 'Recycling one aluminum can saves enough energy to run a TV for three hours. Yet many cans still end up in the trash. Small habits, like sorting waste at home, can make a surprisingly large difference for the planet.',
 '이 글의 주제는?', '재활용 습관의 중요성', ['TV 시청의 문제점','알루미늄을 만드는 방법','쓰레기장의 구조']),
(550, '세부사항파악부족',
 'The Great Wall of China is over 21,000 kilometers long. It was built over many centuries by different dynasties to protect the country from invaders.',
 '만리장성을 지은 목적은?', '침입자로부터 나라를 지키려고', ['관광객을 모으려고','강을 건너려고','곡식을 저장하려고']),
(550, '어휘부족',
 'After the marathon, Jake was completely exhausted. He could barely walk to his car.',
 "글의 'exhausted'와 뜻이 가장 가까운 것은?", 'very tired', ['very excited','very hungry','very proud']),
(750, '문맥추론부족',
 'The old lighthouse keeper checked the lamp every night without fail. Ships far out at sea depended on its steady beam; one dark night could mean disaster, so he treated his duty as a matter of _____.',
 '빈칸에 들어갈 말로 알맞은 것은?', 'life and death', ['light entertainment','small talk','good luck']),
(750, '원인결과추론부족',
 'In the 1800s, doctors did not yet know about germs. Many refused to wash their hands between patients. When one doctor, Ignaz Semmelweis, made hand-washing a rule in his hospital, far fewer patients became sick.',
 '환자들이 덜 아프게 된 이유는?', '손 씻기를 규칙으로 만들어서', ['새로운 약을 개발해서','병원을 새로 지어서','환자 수를 줄여서']),
(750, '세부사항파악부족',
 'An octopus has three hearts and blue blood. Two hearts pump blood to the gills, while the third sends it to the rest of the body. Strangely, the main heart stops beating when the octopus swims, which is why it prefers crawling.',
 '문어가 기어 다니는 것을 더 좋아하는 이유는?', '헤엄칠 때 주요 심장이 멈춰서', ['다리가 짧아서','눈이 나빠서','물살이 강해서']),
(900, '주제요지파악부족',
 'Languages disappear at an alarming rate — roughly one every few weeks. When a language dies, more than words are lost: unique ways of describing the world, oral histories, and knowledge of local plants and medicine vanish with it. Linguists therefore race to record endangered languages before the last speakers are gone.',
 '이 글의 주제는?', '언어 소멸의 손실과 기록의 시급함', ['새 언어를 배우는 방법','식물 연구의 역사','문자 발명의 과정']),
(900, '원인결과추론부족',
 'Before refrigeration, spices were worth their weight in gold in Europe, partly because they could mask the taste of food that was no longer fresh. Once refrigerators made it easy to keep food from spoiling, the extraordinary prices that spices once commanded collapsed.',
 '향신료 가격이 폭락한 이유는?', '냉장 기술로 음식 보관이 쉬워져서', ['향신료 농장이 사라져서','유럽인의 입맛이 바뀌어서','금값이 크게 올라서']),
]

# 검증
bands = {}
GAPS = set()
for lx, gap, passage, q, ans, ds in Q:
    bands[lx] = bands.get(lx, 0) + 1
    GAPS.add(gap)
    assert len(set([ans] + ds)) == 4, q
    assert passage.strip() and q.strip()
assert len(bands) == 7 and all(v >= 4 for v in bands.values()), bands
assert len(GAPS) == 9, GAPS  # 리딩 구멍 9종 전부 커버

wb = openpyxl.Workbook()
ws = wb.active
ws.title = '리딩'
cols = ['문제ID','렉사일','문제유형','지문','질문','보기1','보기2','보기3','보기4','정답번호','보기1구멍','보기2구멍','보기3구멍','보기4구멍','이미지파일','음성파일']
ws.append(cols)
for c in ws[1]: c.font = Font(name='Arial', bold=True)

counter = {}
pos = 0
for lx, gap, passage, q, ans, ds in Q:
    counter[lx] = counter.get(lx, 0) + 1
    qid = f"READ-{lx}-{counter[lx]:03d}"
    answer_idx = pos % 4
    pos += 1
    opts = [None]*4; tags = ['']*4
    opts[answer_idx] = ans
    di = 0
    for i in range(4):
        if opts[i] is None:
            opts[i] = ds[di]; tags[i] = gap; di += 1  # 오답 구멍 = 문제유형 (1:1)
    ws.append([qid, lx, gap, passage, q] + opts + [answer_idx+1] + tags + ['',''])
for row in ws.iter_rows(min_row=2):
    for c in row: c.font = Font(name='Arial')
ws.column_dimensions['D'].width = 70
ws.column_dimensions['E'].width = 30
ws.column_dimensions['A'].width = 14

wb.save('/tmp/리딩_보강.xlsx')

from collections import Counter
apos = Counter(r[9] for r in ws.iter_rows(min_row=2, values_only=True))
gcnt = Counter(r[2] for r in ws.iter_rows(min_row=2, values_only=True))
wc = {r[0]: len(str(r[3]).split()) for r in ws.iter_rows(min_row=2, values_only=True)}
print('문항 수:', ws.max_row - 1)
print('정답 위치:', dict(sorted(apos.items())))
print('유형(구멍) 분포:', dict(gcnt))
print('구간별 지문 단어 수(첫 문항):', {k: v for k, v in wc.items() if k.endswith('001')})
