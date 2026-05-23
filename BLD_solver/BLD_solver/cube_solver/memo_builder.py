from pprint import pprint
import csv
from django.conf import settings

def T_perm():
  return "R U R' U' R' F R2 U' R' U' R U R' F'"

def Y_perm():
  return "F R U' R' U' R U R' F' R U R' U' R' F R F'"

def R_Perm():
  return "R U R' F' R U2 R' U2 R' F R U R U2 R' U'"

def Ja_perm():
  return "R' U2 R U R' U2 L U' R U L'"

def Jb_perm():
  return "R U R' F' R U R' U' R' F R2 U' R' U'"



def build_edge_letter_sequence(edge_chain):
  EDGE_LETTERS = {
    ('W','B'):'А',
    ('W','R'):'Б',
    ('W','G'):'В',
    ('W','O'):'Г',
    ('B','W'):'І',
    ('G','W'):'Є',
    ('O','W'):'О',
    ('Y','B'):'Ш',
    ('Y','O'):'Я',
    ('Y','G'):'Ю',
    ('Y','R'):'Е',
    ('B','Y'):'К',
    ('O','Y'):'Р',
    ('G','Y'):'Ж',
    ('R','Y'):'Х',
    ('O','B'):'С',
    ('B','O'):'М',
    ('O','G'):'П',
    ('G','O'):'З',
    ('R','B'):'Ц',
    ('B','R'):'Л',
    ('R','G'):'Ф',
    ('G','R'):'Д',
    ('R','W'):'У'
}
  result = []
  for pair in edge_chain:
      key = list(pair.keys())[0]
      value = pair[key][0]
      tup = (key, value)
      letter = EDGE_LETTERS.get(tup)
      if letter is None:
          letter = EDGE_LETTERS.get(tup[::-1])  
      result.append(letter)
  return ''.join(result)

def build_corner_letter_sequence(corner_chain):
  CORNER_LETTERS = {
    ('W', ('B', 'R')): 'Б',
    ('W', ('G', 'R')): 'В',
    ('W', ('G', 'O')): 'Г',
    ('B', ('R', 'W')): 'Л',
    ('R', ('B', 'W')): 'У',
    ('R', ('G', 'W')): 'Ф',
    ('G', ('R', 'W')): 'Д',
    ('G', ('O', 'W')): 'Є',
    ('O', ('G', 'W')): 'П',
    ('Y', ('B', 'R')): 'Е',
    ('R', ('B', 'Y')): 'Ц',
    ('B', ('R', 'Y')): 'К',
    ('Y', ('B', 'O')): 'Ш',
    ('B', ('O', 'Y')): 'М',
    ('O', ('B', 'Y')): 'С',
    ('Y', ('G', 'O')): 'Я',
    ('O', ('G', 'Y')): 'Р',
    ('G', ('O', 'Y')): 'З',
    ('Y', ('G', 'R')): 'Ю',
    ('R', ('G', 'Y')): 'Х',
    ('G', ('R', 'Y')): 'Ж',
}
  result = []
  for corner in corner_chain:
      key = list(corner.keys())[0]
      values = tuple(sorted(corner[key]))
      corner_key = (key, values)
      letter = CORNER_LETTERS.get(corner_key)
      result.append(letter)
  return ''.join(result)


def Get_edges_algorithm(edge_letters):
  SET_UP_MOVES={
    'А': f"{Ja_perm()}",
    'В': f"{Jb_perm()}",
    'Г': f"{T_perm()}",
    'І': f"M {Jb_perm()} M'",
    'Є': f"M D' L2 {T_perm()} L2 D M'",
    'О': f"L2 D M' {Jb_perm()} M D' L2",
    'Ш': f"M2 {Jb_perm()} M2",
    'Я': f"L2 {T_perm()} L2",
    'Ю': f"D' L2 {T_perm()} L2 D",
    'Е': f"D2 L2 {T_perm()} L2 D2",
    'К': f"D2 M' {Jb_perm()} M D2",
    'Р': f"D M' {Jb_perm()} M D'",
    'Ж': f"M' {Jb_perm()} M",
    'Х': f"D' M' {Jb_perm()} M D",
    'С': f"Dw L' {T_perm()} L Dw'",
    'М': f"L {T_perm()} L'",
    'П': f"Dw' L {T_perm()} L' Dw",
    'З': f"L' {T_perm()} L",
    'Ц': f"Dw L {T_perm()} L' Dw'",
    'Л': f"Dw2 L' {T_perm()} L Dw2",
    'Ф': f"Dw' L' {T_perm()} L Dw",
    'Д': f"Dw2 L {T_perm()} L' Dw2",
  }
  result=[]

  for letter in edge_letters:
      result.append((letter, SET_UP_MOVES[letter]))
  return result


def Get_corner_algorithm(corner_letters):
  SET_UP_MOVES = {
    'Б': f"R D' F' {Y_perm()} F D R'",
    'В': f"{Y_perm()}",
    'Г': f"F' D R {Y_perm()} R' D' F",
    'Л': f"R' {Y_perm()} R",
    'У': f"R2 F' {Y_perm()} F R2",
    'Ф': f"R' F' {Y_perm()} F R",
    'Д': f"F R {Y_perm()} R' F'",
    'Є': f"F2 R {Y_perm()} R' F2",
    'П': f"F {Y_perm()} F'",
    'Е': f"R2 {Y_perm()} R2",
    'Ц': f"D' R {Y_perm()} R' D",
    'К': f"D' F' {Y_perm()} F D",
    'Ш': f"D' R2 {Y_perm()} R2 D",
    'М': f"D2 R {Y_perm()} R' D2",
    'С': f"D2 F' {Y_perm()} F D2",
    'Я': f"D2 R2 {Y_perm()} R2 D2",
    'Р': f"D R {Y_perm()} R' D'",
    'З': f"D F' {Y_perm()} F D'",
    'Ю': f"D R2 {Y_perm()} R2 D'",
    'Х': f"F' {Y_perm()} F",
    'Ж': f"R {Y_perm()} R'",
  }
  result=[]
  for letter in corner_letters:
      result.append((letter, SET_UP_MOVES[letter]))
  return result

def Get_full_solution(corners, edges, edges_method, parity=False,):
    result = ""
    if edges_method=="OP":
      parity_alg=R_Perm()
    else:
      parity_alg=m2_parity()
    for _, alg in edges:
        result += alg + " "
    if parity==True:
      result += parity_alg+ " "

    for _, alg in corners:
        result += alg + " "


    return result.strip()


def Get_reverse_solution(solution):
    moves = solution.strip().split()
    reversed_moves = []

    for move in reversed(moves):
        if move.endswith("2"):
            reversed_moves.append(move)  
        elif move.endswith("'"):
            reversed_moves.append(move[:-1])  
        else:
            reversed_moves.append(move + "'") 

    return ' '.join(reversed_moves)
  
  
  
  
  #M2 algorithm
def Get_edges_algorithm_m2(edge_letters):
  SET_UP_MOVES={
    'А': f"M2",
    'Б': f"R' U R U' M2 U R' U' R",
    'В': f"U2 M' U2 M'",
    'Г': f"L U' L' U M2 U' L U L'",
    'І': f"U B' R U' B M2 B' U R' B U'",
    'У': f"B' R B M2 B' R' B",
    'Є': f"D M' U R2 U' M U R2 U' D' M2",
    'О': f"B L' B' M2 B L B'",
    'Ш': f"M U2 M U2",
    'Я': f"U' L2 U M2 U' L2 U",
    'Е': f"U R2 U' M2 U R2 U'",
    'К': f"M2 D U R2 U' M' U R2 U' M D'",
    'Р': f"B L B' M2 B L' B'",
    'Х': f"B' R' B M2 B' R B",
    'С': f"L B L' B' M2 B L B' L'",
    'М': f"U' L U M2 U' L' U",
    'П': f"B L2' B' M2 B L2 B'",
    'З': f"U' L' U M2 U' L U",
    'Ц': f"R' B' R B M2 B' R' B R",
    'Л': f"U R' U' M2 U R U'",
    'Ф': f"B' R2 B M2 B' R2 B",
    'Д': f"U R U' M2 U R' U'",
  }
  result=[]
  opposite_map = {
        "В": "Ш", "Ш": "В",
        "Є": "К", "К": "Є"
    } 
  result = []
  
  for i, letter in enumerate(edge_letters):
      if i % 2 != 0 and letter in opposite_map:
          target_algorithm = SET_UP_MOVES[opposite_map[letter]]
          result.append((letter, target_algorithm))
      else:
          result.append((letter, SET_UP_MOVES[letter]))
          
  return result


  
def m2_parity():
  return "D' L2 D M2 D' L2 D"

def letters_to_words(sequence, table):
  # print("початок функції")
  # print("TABLE TYPE:", type(table))
  # print("TABLE NONE?", table is None)
  result = []
  i = 0
  while i < len(sequence):
      if i + 1 >= len(sequence):
          result.append(sequence[i])
          break

      first = sequence[i]
      second = sequence[i + 1]

      word = table.get(first, {}).get(second)

      if word:
          result.append(word)
      else:
          result.append(f"{first}{second}")

      i += 2

  return result
  
from functools import lru_cache
import csv
from django.conf import settings

@lru_cache
def get_memo_table():
    table = {}

    with open(settings.MEMO_FILE_PATH, "r", encoding="utf-8") as file:
        reader = csv.reader(file)
        rows = list(reader)
        headers = rows[0]

        for row in rows[1:]:
            if not row or not row[0]:
                continue

            table[row[0]] = {}

            for i in range(1, len(headers)):
                if i < len(row) and row[i]:
                    table[row[0]][headers[i]] = row[i]

    return table
                
MEMO_TABLE = None

def set_memo_table(table):
    global MEMO_TABLE
    MEMO_TABLE = table
    