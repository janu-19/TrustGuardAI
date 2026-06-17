import marshal
import pathlib
import dis
import inspect
import sys

def inspect_pyc(filepath):
    print(f"=== Inspecting {filepath} ===")
    data = pathlib.Path(filepath).read_bytes()
    # Skip python 3.10 header (16 bytes)
    code_obj = marshal.loads(data[16:])
    
    print("Code Object Name:", code_obj.co_name)
    print("Constants:", code_obj.co_consts)
    print("Names:", code_obj.co_names)
    print("Varnames:", code_obj.co_varnames)
    
    print("\n--- Disassembly ---")
    dis.dis(code_obj)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        inspect_pyc(sys.argv[1])
    else:
        print("Please provide a .pyc file path")
