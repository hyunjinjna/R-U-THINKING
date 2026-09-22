# -*- coding: utf-8 -*-
"""리딩 문제은행 전면 개정판 — 2026-09-21 Julia 피드백 반영
원칙: 지문 길이 상향 / 오답 2+2(표면 함정) / 보기별 구멍 태그 / 구문(phrase) 변별 / 상향 통과 차단
각 문항 개별 설계 (공장식 템플릿 없음)"""
import openpyxl

Q = []
def q(band, qtype, passage, question, answer, d1, d2, d3):
    Q.append(dict(band=band, qtype=qtype, passage=passage, question=question,
                  answer=answer, distractors=[d1, d2, d3]))

# ───────── 120L (4~6문장, 쉬운 문장에 정보 여러 개) ─────────
q(120, '세부사항파악부족',
  "This is my cat, Coco. Coco is small and white. She has a pink ribbon. She likes milk. She sleeps on my bed.",
  "코코는 무슨 색인가요?",
  "White", ("Pink", "세부사항파악부족"), ("Black", "세부사항파악부족"), ("Brown", "세부사항파악부족"))
q(120, '세부사항파악부족',
  "It is morning. My family eats breakfast together. Dad eats eggs. Mom eats bread. I eat rice. My little sister drinks milk.",
  "엄마는 무엇을 먹나요?",
  "Bread", ("Eggs", "세부사항파악부족"), ("Rice", "세부사항파악부족"), ("Milk", "세부사항파악부족"))
q(120, '어휘부족',
  "Today is very hot. I run and play outside. Now I am thirsty. I want cold water. Mom gives me juice too.",
  "'thirsty'는 무슨 뜻인가요?",
  "목이 마른", ("배가 고픈", "어휘부족"), ("졸린", "어휘부족"), ("화가 난", "어휘부족"))
q(120, '주제요지파악부족',
  "I go to the park with my brother. We run fast. We fly a kite. We eat ice cream. We laugh a lot. What a fun day!",
  "무엇에 관한 글인가요?",
  "공원에서 보낸 즐거운 하루", ("아이스크림을 만드는 방법", "주제요지파악부족"),
  ("연을 만드는 방법", "주제요지파악부족"), ("학교에 가는 길", "주제요지파악부족"))
q(120, '지시어이해부족',
  "This is my friend Ben. Ben has a small dog. It is very fast. It likes balls. Ben and the dog play every day.",
  "'It'은 무엇을 가리키나요?",
  "the dog", ("Ben", "지시어이해부족"), ("a ball", "지시어이해부족"), ("my friend", "지시어이해부족"))
q(120, '문맥추론부족',
  "Rain falls and falls. The sky is dark. I want to go outside. I need my ___.",
  "빈칸에 알맞은 말은?",
  "umbrella", ("sunglasses", "문맥추론부족"), ("bed", "문맥추론부족"), ("pencil", "문맥추론부족"))

# ───────── 260L (5~7문장 / 쪽지·편지·이야기) ─────────
q(260, '세부사항파악부족',
  "Minho, I am at the store now. Come home at 5 o'clock. We will eat pizza at 6. Wash your hands first. Love, Mom.",
  "민호는 몇 시에 집에 와야 하나요?",
  "5 o'clock", ("6 o'clock", "세부사항파악부족"), ("4 o'clock", "세부사항파악부족"), ("7 o'clock", "세부사항파악부족"))
q(260, '어휘부족',
  "Ben ate three bowls of rice and two apples. Now his tummy hurts a little. He is too full. He cannot eat one more bite.",
  "'full'은 어떤 상태인가요?",
  "배가 부른 상태", ("배가 고픈 상태", "어휘부족"), ("많이 아픈 상태", "문맥추론부족"), ("아주 기쁜 상태", "어휘부족"))
q(260, '문맥추론부족',
  "Sora lost her front tooth today. She was surprised, but it did not hurt. She put the tooth under her pillow. She wants to meet the tooth fairy tonight. So she went to bed ___.",
  "빈칸에 알맞은 말은?",
  "early", ("late", "문맥추론부족"), ("sadly", "문맥추론부족"), ("loudly", "어휘부족"))
q(260, '원인결과추론부족',
  "Tom looked out the window. Rain! He put on his yellow boots and took his umbrella. At school, his friend Jack had wet socks. Jack did not wear boots today.",
  "잭의 양말은 왜 젖었나요?",
  "장화를 신지 않아서", ("노란 장화를 신어서", "원인결과추론부족"),
  ("우산을 학교에 두고 와서", "원인결과추론부족"), ("창문을 열어 두어서", "세부사항파악부족"))
q(260, '주제요지파악부족',
  "Dear Grandma, We have a new puppy! His name is Mango. He is small and soft. He runs around the sofa all day. Mom says I must feed him every morning. Please come and see him! Love, Jiho.",
  "지호가 편지를 쓴 이유는 무엇인가요?",
  "새 강아지 소식을 알리려고", ("새 소파를 자랑하려고", "주제요지파악부족"),
  ("할머니의 생신을 축하하려고", "주제요지파악부족"), ("밥 주는 방법을 물어보려고", "주제요지파악부족"))
q(260, '지시어이해부족',
  "Mia made cookies with her mom. They put chocolate on top. After school, Mia gave them to her friends. Her friends said, 'Wow, so sweet!'",
  "'them'은 무엇을 가리키나요?",
  "the cookies", ("her friends", "지시어이해부족"), ("Mia and her mom", "지시어이해부족"), ("the chocolates", "지시어이해부족"))

# ───────── 330L (6~8문장 / 안내문·설명문) ─────────
q(330, '세부사항파악부족',
  "School Notice — Field Trip to the Zoo. Date: Friday, May 10. Please bring: lunch, water, and a hat. Do NOT bring: candy or toys. The bus leaves at 9 o'clock. Please do not be late!",
  "소풍에 꼭 가져가야 하는 것은 무엇인가요?",
  "A hat", ("Candy", "세부사항파악부족"), ("Toys", "세부사항파악부족"), ("A camera", "세부사항파악부족"))
q(330, '어휘부족',
  "Jenny wants a new bike. Every week, she puts her coins in her piggy bank. She does not buy candy anymore. 'I am saving my money,' she says. Soon she will have enough for the bike.",
  "여기서 'saving'의 뜻은 무엇인가요?",
  "(돈을) 모으고 있다", ("(사람을) 구하고 있다", "어휘부족"),
  ("(돈을) 쓰고 있다", "문맥추론부족"), ("(돈을) 세고 있다", "어휘부족"))
q(330, '문맥추론부족',
  "Leo's plant looked sad. Its leaves were brown and dry. Leo forgot something important for many days. He quickly got a cup and ___ the plant. After a week, new green leaves came out.",
  "빈칸에 알맞은 말은?",
  "watered", ("painted", "문맥추론부족"), ("cut", "문맥추론부족"), ("smelled", "어휘부족"))
q(330, '원인결과추론부족',
  "Our class was going to have the reading contest on Monday. But our teacher was sick that day. So the contest moved to Wednesday. On Wednesday, Dan read his book loudly and clearly. He won first prize!",
  "대회가 수요일로 옮겨진 이유는 무엇인가요?",
  "선생님이 아프셔서", ("댄이 우승을 해서", "원인결과추론부족"),
  ("학생들이 책을 읽지 않아서", "원인결과추론부족"), ("월요일이 쉬는 날이어서", "세부사항파악부족"))
q(330, '주제요지파악부족',
  "Bees are small but very busy. They fly from flower to flower. They drink sweet juice from the flowers. Then they make honey with it. Bees also help flowers grow. Without bees, we would have less fruit. Bees are little helpers of nature!",
  "이 글의 중심 내용은 무엇인가요?",
  "벌이 자연에서 하는 중요한 일", ("꿀을 맛있게 먹는 방법", "주제요지파악부족"),
  ("꽃을 예쁘게 기르는 방법", "주제요지파악부족"), ("과일이 자라는 곳", "세부사항파악부족"))
q(330, '지시어이해부족',
  "Ken has two caps. The red one is old, but he loves it very much. The blue one is new. Today, Ken wore the old one to the soccer game. His sister laughed at him, but Ken did not care.",
  "켄이 경기에 쓰고 간 'the old one'은 무엇인가요?",
  "the red cap", ("the blue cap", "지시어이해부족"), ("his sister's cap", "지시어이해부족"), ("a new soccer ball", "세부사항파악부족"))

# ───────── 430L (한 문단, phrase 시작: look for·look after·give up·leave behind) ─────────
q(430, '원인결과추론부족',
  "Last Friday, our school had a big concert. Mina was going to play the piano. But that morning, she left her music book behind at home. She was very nervous without it. Her teacher smiled and said, \"You practiced every day. Your hands remember the song.\" Mina closed her eyes and played. When the song ended, everyone clapped loudly.",
  "미나가 긴장한 이유는 무엇인가요?",
  "She left her music book at home.", ("Everyone clapped very loudly.", "원인결과추론부족"),
  ("She did not like playing the piano.", "세부사항파악부족"), ("The concert was at Mina's house.", "세부사항파악부족"))
q(430, '세부사항파악부족',
  "On Saturday, our family went camping by the river. Dad set up the tent while Mom made sandwiches for everyone. My brother Jun looked for dry wood for the fire. I helped Mom cut the vegetables. At night, Jun's fire kept us warm, and Dad told funny stories inside the tent.",
  "불에 쓸 나무를 찾아온 사람은 누구인가요?",
  "Jun", ("Dad", "세부사항파악부족"), ("Mom", "세부사항파악부족"), ("I", "세부사항파악부족"))
q(430, '어휘부족',
  "Next week, my neighbor Ms. Park will visit her son in Busan. She asked me to look after her cat, Butter, for three days. I will give Butter food and clean water every morning. I will also play with him after school so he will not feel lonely. Ms. Park promised to bring me a gift.",
  "'look after'의 뜻은 무엇인가요?",
  "돌보다", ("찾아보다", "어휘부족"), ("쳐다보다", "어휘부족"), ("따라가다", "어휘부족"))
q(430, '문맥추론부족',
  "The soccer final was over, and our team lost by one goal. Some players started to cry on the field. Then our coach gathered us in a circle. \"You ran until the very end, and you never gave up,\" he said with a warm voice. \"That is why ___.\"",
  "빈칸에 가장 알맞은 말은?",
  "I am proud of every one of you", ("you lost the game today", "문맥추론부족"),
  ("the game was not important at all", "문맥추론부족"), ("you should cry more loudly", "문맥추론부족"))
q(430, '주제요지파악부족',
  "Our class started a 'No Trash Week' project. We brought lunch boxes instead of plastic bags. We used both sides of our paper. We also picked up trash on the playground after lunch every day. At the end of the week, our trash can was almost empty. Small actions can make a big change!",
  "이 글의 요지는 무엇인가요?",
  "작은 실천이 큰 변화를 만든다", ("쓰레기통을 깨끗이 비우는 방법", "주제요지파악부족"),
  ("점심 도시락을 맛있게 싸는 방법", "주제요지파악부족"), ("운동장에서 재미있게 노는 방법", "세부사항파악부족"))
q(430, '지시어이해부족',
  "Emma found two kittens in a box near the school. One was loud and hungry. The other one was quiet and afraid. Emma gave her milk to the loud one first. Then she slowly reached out her hand to the quiet one. It finally came to her and licked her finger.",
  "마지막 문장의 'It'은 무엇을 가리키나요?",
  "the quiet kitten", ("the loud kitten", "지시어이해부족"), ("Emma's hand", "지시어이해부족"), ("the box", "지시어이해부족"))

# ───────── 550L (8~10문장 / 레시피·이메일 / used to·run out of·in order to·take care of) ─────────
q(550, '세부사항파악부족',
  "How to Make Easy Pancakes — First, mix flour, milk, and one egg in a big bowl. Second, heat the pan for two minutes. Third, pour the mix into the pan. When you see small bubbles on top, turn the pancake over. Cook it one more minute. Finally, put honey on top before you eat. Be careful: if you turn the pancake before the bubbles come out, it will break into pieces.",
  "팬케이크를 뒤집어야 하는 때는 언제인가요?",
  "위에 작은 거품이 생겼을 때", ("팬을 2분 동안 데운 직후에", "세부사항파악부족"),
  ("꿀을 위에 올린 다음에", "세부사항파악부족"), ("팬케이크가 조각났을 때", "세부사항파악부족"))
q(550, '어휘부족',
  "Dad and I decided to bake bread on Sunday morning. We mixed everything and put the dough in the oven. While it was baking, Dad wanted to make one more loaf for our neighbor. But we had run out of flour — the bag was completely empty. So we drove to the store to buy more. When we came back, the whole house smelled wonderful.",
  "'run out of'의 뜻은 무엇인가요?",
  "~을 다 써서 없다", ("~의 밖으로 뛰어나가다", "어휘부족"),
  ("~을 바닥에 쏟다", "어휘부족"), ("~을 사러 나가다", "문맥추론부족"))
q(550, '문맥추론부족',
  "Grandpa used to be a sailor when he was young. Now he lives quietly in a small town, but he still keeps a big world map on his wall. Yesterday, I pointed at the map and asked about his old trips. Grandpa was quiet for a moment. Then he smiled and talked for two hours without stopping — about storms, dolphins, and midnight stars. I think he ___ those days on the sea.",
  "빈칸에 가장 알맞은 말은?",
  "really misses", ("completely forgot", "문맥추론부족"),
  ("is angry about", "문맥추론부족"), ("was bored by", "문맥추론부족"))
q(550, '원인결과추론부족',
  "Our class picnic was planned for Tuesday at Green Park. On Monday night, the news said it might rain the next day. Tuesday morning was cloudy but dry. However, the park was closed because workers were fixing the broken fountain. So we had our picnic in the school garden instead. Luckily, the sun came out at noon, and we played games on the grass.",
  "소풍 장소가 바뀐 진짜 이유는 무엇인가요?",
  "공원이 분수 공사로 문을 닫아서", ("화요일에 비가 많이 와서", "원인결과추론부족"),
  ("아침 날씨가 흐렸기 때문에", "원인결과추론부족"), ("학교 정원이 더 넓어서", "세부사항파악부족"))
q(550, '주제요지파악부족',
  "Dear Coach Kim, Thank you for teaching me for two years. I want to tell you something honestly. Swimming practice starts at 6 a.m., and I also started violin lessons at night. These days I am always tired, and my grades are going down. I love swimming, but I need to slow down in order to take care of my health. May I come to practice three days a week instead of five? I will still do my best in the pool. — Dana",
  "다나가 이메일을 쓴 목적은 무엇인가요?",
  "연습 횟수를 줄여도 되는지 부탁하려고", ("수영을 완전히 그만두겠다고 말하려고", "주제요지파악부족"),
  ("코치님께 감사 인사만 전하려고", "주제요지파악부족"), ("바이올린 대회 소식을 알리려고", "세부사항파악부족"))
q(550, '지시어이해부족',
  "Jiwon checks her phone as soon as she wakes up. She checks it during meals and even while walking to school. Last week, she almost walked into a glass door. Her mom worries about this habit a lot. So Jiwon made two rules for herself: no phone at the table, and no phone on the stairs. Keeping the rules will not be easy, but she really wants to try.",
  "'this habit'이 가리키는 것은 무엇인가요?",
  "휴대폰을 계속 확인하는 것", ("유리문에 부딪히는 것", "지시어이해부족"),
  ("계단에서 뛰어다니는 것", "지시어이해부족"), ("아침에 일찍 일어나는 것", "세부사항파악부족"))
q(550, '문장구조이해부족',
  "The season final ended at last, and the sky was full of cheers. Ben, who had never won anything before, held up the trophy that his whole team had worked for all year. His hands were shaking, but his smile was the brightest one on the field. Cameras flashed, and his teammates lifted him into the air.",
  "지문의 내용과 일치하는 것은 무엇인가요?",
  "벤은 전에는 무언가를 이겨 본 적이 없다", ("트로피는 벤 혼자서 노력한 결과이다", "문장구조이해부족"),
  ("팀은 일 년 동안 벤을 기다려 주었다", "문장구조이해부족"), ("벤은 트로피를 들고 눈물을 흘렸다", "세부사항파악부족"))

# ───────── 750L (10~12문장 / 과학·회상 서사·항의 편지 / figure out·turn out·end up·no longer) ─────────
q(750, '세부사항파악부족',
  "The octopus is one of the smartest animals in the sea. It has eight arms, three hearts, and blue blood. Two of the hearts send blood to the gills, while the third one works for the rest of the body. Strangely, that third heart stops beating whenever the octopus swims. This is why an octopus usually prefers walking along the sea floor instead of swimming. An octopus can also change the color of its skin in less than a second to hide from its enemies. Scientists are still discovering new facts about this amazing animal every year.",
  "문어가 헤엄칠 때 일어나는 일은 무엇인가요?",
  "세 번째 심장이 뛰는 것을 멈춘다", ("심장 두 개가 뛰는 것을 멈춘다", "세부사항파악부족"),
  ("피가 파란색으로 변한다", "세부사항파악부족"), ("피부색을 바꿀 수 없게 된다", "세부사항파악부족"))
q(750, '문맥추론부족',
  "For months, Mr. Lee's bakery was quiet. His bread was delicious, but the shop was hard to find, hidden behind a tall building. He tried lowering his prices, and then he put up bigger signs, but nothing worked. Then one evening, a customer posted a single photo of his chocolate croissant online. The next morning, a long line of people stood in front of the door, all holding their phones. Mr. Lee finally figured out that these days, ___.",
  "빈칸에 가장 알맞은 말은?",
  "one photo can bring more people than any sign", ("cheaper bread always wins customers", "문맥추론부족"),
  ("tall buildings are good for small shops", "문맥추론부족"), ("people no longer eat croissants", "문맥추론부족"))
q(750, '원인결과추론부족',
  "The town of Riverside used to flood every single summer. For years, people blamed the old bridge, saying it was too low and blocked the water. The town finally spent a huge amount of money to build a new, higher bridge. But the next summer, the streets flooded again, worse than before. Engineers then studied the river carefully and found the real problem: tons of trash had piled up under the water and was stopping the flow. After the river bottom was cleaned, the floods finally ended. The new bridge, it turned out, had never been the answer.",
  "홍수가 계속되었던 진짜 원인은 무엇인가요?",
  "강 밑에 쌓인 쓰레기가 물길을 막아서", ("오래된 다리가 너무 낮아서", "원인결과추론부족"),
  ("새 다리를 잘못 지어서", "원인결과추론부족"), ("여름마다 비가 너무 많이 와서", "문맥추론부족"))
q(750, '주제요지파악부족',
  "Many schools are replacing paper textbooks with tablets. Tablets are lighter, and students can carry hundreds of books in one thin device. Teachers can update lessons in seconds, too. However, doctors warn that too much screen time can hurt young eyes, and some students end up playing games instead of studying in class. Paper books, on the other hand, are heavy but easier to focus on. Perhaps the answer is not choosing one side, but learning when to use each tool well.",
  "글쓴이의 결론은 무엇인가요?",
  "상황에 맞게 둘을 골라 쓰는 법을 배워야 한다", ("태블릿이 종이책보다 언제나 낫다", "주제요지파악부족"),
  ("눈 건강을 위해 종이책만 써야 한다", "주제요지파악부족"), ("수업 중 게임은 공부에 도움이 된다", "세부사항파악부족"))
q(750, '문장구조이해부족',
  "Last weekend, we cleaned the dusty attic and found a small wooden box. Inside was an old letter with soft, yellow paper. The letter that my grandmother wrote to my mother, who was studying far away from home at that time, was over thirty years old. Mom read it slowly by the window and quietly wiped her eyes. She said she would keep it in her desk forever.",
  "그 편지를 쓴 사람은 누구인가요?",
  "할머니", ("엄마", "문장구조이해부족"), ("멀리서 공부하던 할머니", "문장구조이해부족"), ("글쓴이(나)", "문장구조이해부족"))
q(750, '순서구조파악부족',
  "Standing on the stage with her gold medal, Yuna could not stop smiling. Just one year ago, she had quit skating completely after breaking her ankle in practice. During those dark months, she watched old videos of herself and cried alone in her room. It was her little brother who dragged her back to the ice rink one cold morning. She fell many times that day, but she laughed on the ice for the first time in months. Now, hearing the crowd shout her name, she searched for her brother's face in the seats.",
  "실제로 일어난 순서에서 가장 먼저 일어난 일은 무엇인가요?",
  "유나가 연습 중에 발목을 다쳤다", ("유나가 메달을 들고 무대에 섰다", "순서구조파악부족"),
  ("동생이 유나를 링크장에 데려갔다", "순서구조파악부족"), ("관중이 유나의 이름을 외쳤다", "순서구조파악부족"))
q(750, '어조의도파악부족',
  "Dear Star Toys, Last month, I ordered a robot kit for my son's ninth birthday. The box arrived right on time, and the design on the cover was wonderful. However, when we opened it, three important parts were missing, so the robot cannot stand up. My son had checked the mailbox every day before his birthday, and I had to watch his disappointed face at the party. I believe this was a simple mistake at the factory. Could you please send the missing parts before this Friday? Thank you for your time. — Ms. Han",
  "글쓴이가 편지를 쓴 의도는 무엇인가요?",
  "빠진 부품을 보내 달라고 요청하려고", ("장난감 회사의 디자인을 칭찬하려고", "어조의도파악부족"),
  ("전체 금액을 환불해 달라고 요구하려고", "어조의도파악부족"), ("아들의 생일 파티에 초대하려고", "세부사항파악부족"))

# ───────── 900L (12~14문장, 두 문단 가능 / take for granted·come across·keep track of) ─────────
q(900, '원인결과추론부족',
  "City parks are often praised for making neighborhoods cooler in summer. When researchers compared two similar streets in Daehan City, the one next to Grand Park was, on average, three degrees cooler. At first, many residents assumed that the shade of the tall trees explained everything. The full story turned out to be more surprising. Trees release water vapor through their leaves, a process called transpiration, which works like a natural air conditioner. Measurements showed that on windless days, this invisible process lowered the temperature even in sunny corners of the park where there was no shade at all. Shade still matters, of course, but mostly by protecting people's skin, not by cooling the air itself. The next time you enjoy a cool park breeze, remember that the trees are quietly 'sweating' for you.",
  "공원이 더 시원한 주된 이유로 이 글이 제시하는 것은 무엇인가요?",
  "나뭇잎이 수증기를 내보내며 공기를 식혀 주기 때문에", ("키 큰 나무들의 그늘이 공기를 차갑게 만들기 때문에", "원인결과추론부족"),
  ("공원에는 바람이 늘 많이 불기 때문에", "세부사항파악부족"), ("사람들이 나무를 열심히 보호하기 때문에", "문장구조이해부족"))
q(900, '문맥추론부족',
  "Before smartphones, people memorized dozens of phone numbers and kept track of appointments in their heads or in small notebooks. Today, we hand these small jobs over to our devices without a second thought. Psychologists call this 'cognitive offloading,' and it is not always a bad thing; forgetting a phone number frees the mind for deeper thinking. The danger appears when we offload everything and practice nothing. Memory, like a muscle, grows weaker when it is never used. Studies show that students who take notes by hand often remember lessons longer than those who only take photos of the board. Perhaps the wise path is not to throw away our devices, but to ___.",
  "빈칸에 가장 알맞은 말은?",
  "choose a few things to remember for ourselves", ("memorize every number as people did before", "문맥추론부족"),
  ("stop thinking deeply and rest our minds", "문맥추론부족"), ("buy a smarter phone with a better camera", "문맥추론부족"))
q(900, '주제요지파악부족',
  "In 1904, an ice cream seller at a fair in America ran out of paper cups on a burning hot day. Right next to him, a waffle maker named Ernest was selling thin, warm waffles that few people wanted in such heat. Ernest quickly rolled one of his waffles into the shape of a cone, and the ice cream seller scooped his ice cream on top of it. Customers loved the crispy, sweet holder, and the line grew longer all afternoon. The two strangers ended up changing dessert history together. Neither man had planned any of it; one man's empty shelf simply came across another man's full one. Great ideas, it seems, are sometimes born not from careful plans but from two problems that happen to fit each other perfectly.",
  "이 글의 제목으로 가장 알맞은 것은 무엇인가요?",
  "두 가지 문제가 만나 태어난 발명품", ("아이스크림을 시원하게 보관하는 방법", "주제요지파악부족"),
  ("와플 장사가 어려웠던 이유", "주제요지파악부족"), ("1904년 미국 박람회의 역사", "세부사항파악부족"))
q(900, '문장구조이해부족',
  "Our school library made an important announcement this week, and the hallway has been noisy ever since. The principal announced that students who return every borrowed book before the last day of the semester will be allowed to borrow twice as many books next term. Many students hurried to check their desks, lockers, and bags for forgotten books. The librarian says she has never seen the return box so full in ten years.",
  "발표의 내용과 일치하는 것은 무엇인가요?",
  "학기 마지막 날 전에 빌린 책을 모두 반납하면 다음 학기에 두 배로 빌릴 수 있다",
  ("학기 마지막 날에 책을 두 권씩 반납해야 한다", "문장구조이해부족"),
  ("다음 학기에는 책을 두 배 빠르게 읽어야 한다", "문장구조이해부족"),
  ("교장 선생님이 도서관에 책을 두 배 많이 사 주었다", "세부사항파악부족"))
q(900, '순서구조파악부족',
  "Chocolate does not begin its life sweet. Cacao pods are first cut down from trees and opened by hand, one by one. The white, bitter beans inside are then piled under large leaves for about a week; this step, called fermentation, is what wakes up the chocolate flavor hiding inside. Only after fermentation is complete are the beans spread out and dried under the sun for several days. The dried beans then travel to factories around the world, where they are roasted, crushed, and slowly mixed with sugar for many hours. Skipping or rushing any single step ruins the taste, which is why good chocolate takes weeks, not hours, to make.",
  "콩을 햇볕에 말리는 일은 언제 하나요?",
  "발효가 끝난 다음에", ("나무에서 열매를 자르기 전에", "순서구조파악부족"),
  ("공장에서 콩을 볶은 다음에", "순서구조파악부족"), ("설탕과 섞는 것과 동시에", "순서구조파악부족"))
q(900, '어조의도파악부족',
  "Every spring, our city spends millions planting rows of flowers along the highway, where drivers pass them at eighty kilometers per hour. Meanwhile, the small park in front of Doran Elementary — the one place where children actually stop, play, and breathe — has not seen a single new tree in ten years. We take it for granted that someone else will speak up for these small places. Nobody does. This Saturday at 10 a.m., the city council holds an open meeting at the community center. If you have ever watched your child search for a piece of shade in that bare park, come and say just one sentence. Flowers for passing cars can wait; shade for growing children cannot.",
  "글쓴이의 주된 의도는 무엇인가요?",
  "시민들이 회의에 나와 공원 개선을 요구하게 하려고", ("고속도로 꽃길의 아름다움을 소개하려고", "어조의도파악부족"),
  ("시의 예산 사용을 객관적으로 설명하려고", "어조의도파악부족"), ("도란초등학교의 위치를 알리려고", "세부사항파악부족"))

# ── 정답 위치 균등 배치 (1~4 × 11) ──
assert len(Q) == 44, len(Q)
counts = {1: 0, 2: 0, 3: 0, 4: 0}
rows = []
serial = {}
for item in Q:
    pos = min(counts, key=lambda p: (counts[p], p))
    counts[pos] += 1
    options = [None] * 4
    gaps = [''] * 4
    options[pos - 1] = item['answer']
    di = 0
    for i in range(4):
        if options[i] is None:
            options[i], gaps[i] = item['distractors'][di]
            di += 1
    b = item['band']
    serial[b] = serial.get(b, 0) + 1
    rows.append([f"READ-{b}-{serial[b]:03d}", b, item['qtype'], item['passage'], item['question'],
                 *options, pos, *gaps, '', ''])

wb = openpyxl.load_workbook('/mnt/user-data/outputs/레벨테스트_문제은행_완성본.xlsx')
ws = wb['리딩']
ws.delete_rows(2, ws.max_row)
for r in rows:
    ws.append(r)
wb.save('/mnt/user-data/outputs/레벨테스트_문제은행_완성본.xlsx')
print("정답 위치 분포:", counts)
from collections import Counter
print("구간별:", dict(Counter(r[1] for r in rows)))
print("총", len(rows), "문항 저장 완료")
