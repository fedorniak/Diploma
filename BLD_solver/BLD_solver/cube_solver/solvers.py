

def solve_corners(corners):
    solved = [] 
    result= [] 
    counter=0   
    for idx in range(2, len(corners) + 1):
        corner = corners[idx]
        keys = [list(d.keys())[0] for d in corner]
        values = [list(d.values())[0] for d in corner]
        if set(keys) == set(values):
            solved.append({keys[0]: keys[1:]})
    while True:
        counter+=1
        corner = corners[1]  
        key = corner[0]['W']  
        val1 = corner[1][list(corner[1].keys())[0]]  
        val2 = corner[2][list(corner[2].keys())[0]]  
        buffer = {key: [val1, val2]}
        num = None
        should_exit = False
        for idx, corner in corners.items():
            keys_in_row = {list(d.keys())[0] for d in corner}
            if key in keys_in_row and val1 in keys_in_row and val2 in keys_in_row and idx == 1:
                for key, item in corners.items():
                    found_spot = None
                    if(key==1):
                        continue
                    else:
                        item_keys = [list(d.keys())[0] for d in item]
                        keys=set(item_keys)
                        match=False
                        for k in solved:
                            match=False
                            val1 = list(k.keys())[0]        
                            val2, val3 = k[val1]
                            lst = [val1, val2, val3]
                            sol=set(lst)
                            if keys==sol:
                                match=True
                                break
                            
                    if match==False:
                        found_spot=key
                        break
       
                if found_spot==None:
                    should_exit = True
                    break

                key = list(corners[found_spot][0].values())[0]  
                values = [list(item.values())[0] for item in corners[found_spot][1:]]  
                new_buffer = {key: values}  

                pos_key = list(corners[found_spot][0].keys())[0]  
                pos_keys = [list(item.keys())[0] for item in corners[found_spot][1:]]  
                pos_buffer = {pos_key: pos_keys}
                if found_spot is not None:                                                     
                    val1 = list(buffer.keys())[0]      
                    val2, val3 = buffer[val1]
                    keys = [list(d.keys())[0] for d in corners[found_spot]]
                    values = [val1, val2, val3]
                    updated_row = []
                    for k, v in zip(keys, values):
                        updated_row.append({k: v})      
                    corners[found_spot] = updated_row
                val11 = list(new_buffer.keys())[0]
                val22, val33 = new_buffer[val11]
                first_row = corners[1]
                updated_first_row = []
                for item in first_row:
                    for key_in_item, value in item.items():
                        if key_in_item == 'W':
                            updated_first_row.append({key_in_item: val11})  
                        elif key_in_item == 'B':
                            updated_first_row.append({key_in_item: val22})  
                        elif key_in_item == 'O':
                            updated_first_row.append({key_in_item: val33})  

                corners[1] = updated_first_row
                result.append(pos_buffer)
                
                break
            elif key in keys_in_row and val1 in keys_in_row and val2 in keys_in_row:

                num = idx
                if num is not None:
                    found_row = corners[num]
                    new_buffer = {}

                    for key_in_buffer, val_list in buffer.items():
                        for item in found_row:
                            for key_in_item, value in item.items():
                                if key_in_item == key_in_buffer:

                                    others = [d for d in found_row if d != item]
                                    new_values = [list(d.values())[0] for d in others]
                                    new_buffer[value] = new_values  

                val1 = list(buffer.keys())[0]      
                val2, val3 = buffer[val1]
                keys = [list(d.keys())[0] for d in found_row]
                values = [val1, val2, val3]
                updated_row = []
                for k in keys:
                    matched = None
                    for v in values:
                        if k == v: 
                            matched = v
                            break
                    if matched:
                        updated_row.append({k: matched})
                corners[num] = updated_row
                val11= list(new_buffer.keys())[0]

                val22, val33= new_buffer[val11]
                first_row = corners[1]
                updated_first_row = []
                for item in first_row:
                    for key_in_item, value in item.items():
                        if key_in_item == 'W':
                            updated_first_row.append({key_in_item: val11})  
                        elif key_in_item == 'B':
                            updated_first_row.append({key_in_item: val22})  
                        elif key_in_item == 'O':
                            updated_first_row.append({key_in_item: val33})  
                
                corners[1] = updated_first_row

                solved.append(buffer)
                result.append(buffer)
                break
        if should_exit:
            break
        if counter>20:
            raise ValueError("Неправильно введений кубик")

    res=solve_corner_flips(corners,result)
    return res
  
  
def solve_corner_flips(corners,result):
    to_solve=[]
    for idx, corner in corners.items():
        all_flipped = all(list(d.keys())[0] != list(d.values())[0] for d in corner)
        if all_flipped:
            to_solve.append({idx: corner})

    for flip in to_solve:
        if list(flip.keys())[0] == 1:
            continue
        else:
            idx = list(flip.keys())[0]
            items = flip[idx]

            keys = [list(d.keys())[0] for d in items]  
            values = [list(d.values())[0] for d in items]  

            buffer1 = {keys[0]: keys[1:]}      
            buffer2 = {values[0]: values[1:]}  

            result.append(buffer1)
            result.append(buffer2)
    return result


def fill_corners_from_string(corners_str):
    corners = {
        1: [{'W': None}, {'B': None}, {'O': None}],
        2: [{'W': None}, {'B': None}, {'R': None}],
        3: [{'W': None}, {'G': None}, {'R': None}],
        4: [{'W': None}, {'G': None}, {'O': None}],
        5: [{'Y': None}, {'G': None}, {'O': None}],
        6: [{'Y': None}, {'G': None}, {'R': None}],
        7: [{'Y': None}, {'B': None}, {'R': None}],
        8: [{'Y': None}, {'B': None}, {'O': None}],
    }
    order= {
        'B': [8, 7, 1, 2],
        'O': [8, 1, 5, 4],
        'W': [1, 2, 4, 3],
        'R': [2, 7, 3, 6],
        'G': [4, 3, 5, 6],
        'Y': [5, 6, 8, 7],
    }
    i = 0  

    for face, positions in order.items():
        for pos in positions:
            color = corners_str[i]
            i += 1
            if pos in corners:
                for face_dict in corners[pos]:
                    if face in face_dict:
                        face_dict[face] = color
                        break

    return corners



def solve_edges(edges):
    solved = []
    result = []
    counter=0
    for idx in range(2, len(edges) + 1):
        edge = edges[idx]
        keys = [list(d.keys())[0] for d in edge]
        values = [list(d.values())[0] for d in edge]
        if set(keys) == set(values):
            solved.append({keys[0]: [keys[1]]})
    while True:
        counter+=1
        edge = edges[1]
        key = list(edge[0].values())[0]
        val1 = list(edge[1].values())[0]
        buffer = {key: [val1]}
        should_exit = False
        num = None

        for idx, item in edges.items():
            keys_in_row = {list(d.keys())[0] for d in item}
            if key in keys_in_row and val1 in keys_in_row and idx == 1:
                found_spot = None
                for k, v in edges.items():
                    if k == 1:
                        continue
                    keys = {list(d.keys())[0] for d in v}
                    if any(set(list(solved_dict.keys()) + solved_dict[list(solved_dict.keys())[0]]) == keys for solved_dict in solved):
                        continue
                    else:
                        found_spot = k
                        break

                if found_spot is None:
                    should_exit = True
                    break

                new_key = list(edges[found_spot][0].values())[0]
                new_val = list(edges[found_spot][1].values())[0]
                new_buffer = {new_key: [new_val]}

                pos_key = list(edges[found_spot][0].keys())[0]
                pos_val = list(edges[found_spot][1].keys())[0]
                pos_buffer = {pos_key: [pos_val]}

                keys = [list(d.keys())[0] for d in edges[found_spot]]
                values = [key, val1]
                updated_row = [{k: v} for k, v in zip(keys, values)]
                edges[found_spot] = updated_row

                edges[1] = [
                    {list(edges[1][0].keys())[0]: new_key},
                    {list(edges[1][1].keys())[0]: new_val},
                ]

                result.append(pos_buffer)
                break

            elif key in keys_in_row and val1 in keys_in_row:
                num = idx
                break

        if num is not None:
            found_row = edges[num]
            new_buffer = {}

            for key_in_buffer, val_list in buffer.items():
                for item in found_row:
                    if key_in_buffer in item:
                        others = [d for d in found_row if d != item]
                        new_val = list(others[0].values())[0]
                        new_buffer[item[key_in_buffer]] = [new_val]


            val1_buf = list(buffer.keys())[0]
            val2_buf = buffer[val1_buf][0]
            keys = [list(d.keys())[0] for d in found_row]
            values = [val1_buf, val2_buf]
            updated_row = []

            for k in keys:
                matched = None
                for v in values:
                    if k == v:
                        matched = v
                        break
                if matched:
                    updated_row.append({k: matched})

            edges[num] = updated_row

            val1_buf = list(new_buffer.keys())[0]
            val2_buf = new_buffer[val1_buf][0]
            edges[1] = [
                {list(edges[1][0].keys())[0]: val1_buf},
                {list(edges[1][1].keys())[0]: val2_buf},
            ]

            solved.append(buffer)
            result.append(buffer)

        if counter>30:
            raise ValueError("Неправильно введений кубик")

        if should_exit:
            break
    res = solve_edge_flips(edges, result)
    return res

def solve_edge_flips(edges, result):
    to_solve = []
    for idx, edge in edges.items():
        all_flipped = all(list(d.keys())[0] != list(d.values())[0] for d in edge)
        if all_flipped:
            to_solve.append({idx: edge})

    for flip in to_solve:
        idx = list(flip.keys())[0]
        if idx == 1:
            continue

        items = flip[idx]
        keys = [list(d.keys())[0] for d in items]
        values = [list(d.values())[0] for d in items]

        buffer1 = {keys[0]: [keys[1]]}
        buffer2 = {values[0]: [values[1]]}

        result.append(buffer1)
        result.append(buffer2)

    return result

def fill_edges_from_string(edges_str):
    edges = {
            1: [{'W': None}, {'R': None}],
            2: [{'W': None}, {'G': None}],
            3: [{'W': None}, {'O': None}],
            4: [{'W': None}, {'B': None}],
            5: [{'O': None}, {'B': None}],
            6: [{'B': None}, {'R': None}],
            7: [{'R': None}, {'G': None}],
            8: [{'G': None}, {'O': None}],
            9: [{'Y': None}, {'G': None}],
            10: [{'Y': None}, {'R': None}],
            11: [{'Y': None}, {'B': None}],
            12: [{'Y': None}, {'O': None}],
        }
    order= {
        'B': [11, 5, 6, 4],
        'O': [5, 12, 3, 8],
        'W': [4, 3, 1, 2],
        'R': [6, 1, 10, 7],
        'G': [2, 8, 7, 9],
        'Y': [9, 12, 10, 11],
    }
    i = 0  
    for face, positions in order.items():
        for pos in positions:
            color = edges_str[i]
            i += 1

            if pos in edges:
                for face_dict in edges[pos]:
                    if face in face_dict:
                        face_dict[face] = color
                        break

    return edges
