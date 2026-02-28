import os

env_path = '.env.local'
if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    changed = False
    for line in lines:
        if line.startswith('DATABASE_URL='):
            if '-pooler' in line:
                print(f"Found pooler in line: {line.strip()}")
                new_line = line.replace('-pooler', '')
                new_lines.append(new_line)
                changed = True
                print(f"Changed to: {new_line.strip()}")
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)
    
    if changed:
        with open(env_path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print("Updated .env.local to use direct Neon endpoint.")
    else:
        print("No '-pooler' found in DATABASE_URL or file already up to date.")
else:
    print(".env.local not found.")
