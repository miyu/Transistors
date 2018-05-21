from InstantInsanity import INITIAL_STATE, OPERATORS, GOAL_TEST


visited = {}
q = [(None, None, INITIAL_STATE)]

while True:
    prior, op, current = q.pop(0)

    if current in visited: continue
    visited[current] = (prior, op)

    if len(visited) % 10 == 0:
        print("VISIT: " + str(len(visited)))

    if GOAL_TEST(current):
        print("Done:")
        while current is not None:
            prior, op = visited[current]
            print(str(current) + " " + (op.name if op else "INIT"))
            current = prior
        break

    for op in OPERATORS:
        next = op.apply(current)
        if next in visited: continue
        q.append((current, op, next))
