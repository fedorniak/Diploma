from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from .solvers import (
    fill_corners_from_string,
    fill_edges_from_string,
    solve_corners,
    solve_edges,
    solve_edges_m2
)
from .memo_builder import (
    build_corner_letter_sequence, 
    build_edge_letter_sequence,
    Get_corner_algorithm,Get_edges_algorithm, 
    R_Perm,Get_full_solution,
    Get_reverse_solution,
    m2_parity,
    Get_edges_algorithm_m2,
    letters_to_words,
    get_memo_table,
    )


@csrf_exempt
def solve_rubiks_cube_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method is allowed.'}, status=405)
    try:
        data = json.loads(request.body)
        corners_str = data.get('corners')
        edges_str = data.get('edges')
        edges_method=data.get('edges_method')
        if not corners_str or not edges_str:
            return JsonResponse({'error': 'Missing corners or edges input.'}, status=400)
        corners = fill_corners_from_string(corners_str)
        edges = fill_edges_from_string(edges_str)
        corner_cycles = solve_corners(corners)
        if edges_method=="OP":
            edge_cycles = solve_edges(edges)
        else:
            edge_cycles = solve_edges_m2(edges)
        corner_letter_seq = build_corner_letter_sequence(corner_cycles )
        edge_letter_seq = build_edge_letter_sequence(edge_cycles)
        print("1")
        table = get_memo_table()
        corners_memo = letters_to_words(corner_letter_seq, table)
        print("2")
        edges_memo = letters_to_words(edge_letter_seq, table)
        corners_solution = Get_corner_algorithm(corner_letter_seq)
        if edges_method=="OP":
            edges_solution = Get_edges_algorithm(edge_letter_seq)
        else:
            edges_solution = Get_edges_algorithm_m2(edge_letter_seq)    
            print("3")  
        parity = None
        if len(corner_letter_seq) % 2 == 1 or len(edge_letter_seq) % 2 == 1:
            if edges_method=="OP":
                parity = R_Perm()
            else:
                parity=m2_parity()
        full_solution = Get_full_solution(corners_solution, edges_solution,  edges_method, parity=bool(parity),)
        reverse_solution = Get_reverse_solution(full_solution)
        print("4")
        return JsonResponse({
            'corner_solution': corners_solution,
            'edge_solution': edges_solution,
            'parity': None if parity is None else parity,
            'corner_letter_seq': corner_letter_seq,
            'edge_letter_seq': edge_letter_seq,
            'reverse_solution': reverse_solution,
            'corners_memo':corners_memo,
            'edges_memo':edges_memo,
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)