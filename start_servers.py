"""
Start both the Flask backend and Next.js frontend servers simultaneously.
This script uses subprocess to run both servers in parallel.
"""

import subprocess
import os
import sys
import time
import signal
import atexit
import shutil
import threading

# Define colors for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# Define paths
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, 'backend')
FRONTEND_DIR = ROOT_DIR

# Store subprocess objects
processes = []

def kill_existing_processes():
    """Kill any existing Python and Node.js processes related to the application"""
    print(f"{Colors.HEADER}Checking for existing server processes...{Colors.ENDC}")
    
    killed_processes = 0
    
    # Check if we're on Windows
    if sys.platform == 'win32':
        try:
            # Kill Python processes (backend)
            python_result = subprocess.run(
                ["taskkill", "/f", "/im", "python.exe"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            if "SUCCESS" in python_result.stdout:
                killed_processes += python_result.stdout.count("SUCCESS")
                print(f"{Colors.GREEN}Terminated existing Python processes.{Colors.ENDC}")
            
            # Kill Node.js processes (frontend)
            node_result = subprocess.run(
                ["taskkill", "/f", "/im", "node.exe"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            if "SUCCESS" in node_result.stdout:
                killed_processes += node_result.stdout.count("SUCCESS")
                print(f"{Colors.GREEN}Terminated existing Node.js processes.{Colors.ENDC}")
                
        except Exception as e:
            print(f"{Colors.RED}Error killing existing processes: {e}{Colors.ENDC}")
    else:
        # For Unix-like systems, use a different approach
        try:
            # Kill Python processes
            subprocess.run(
                ["pkill", "-f", "python.*app.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            # Kill Node.js processes
            subprocess.run(
                ["pkill", "-f", "node"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            print(f"{Colors.GREEN}Attempted to terminate existing processes on Unix.{Colors.ENDC}")
        except Exception as e:
            print(f"{Colors.RED}Error killing existing processes on Unix: {e}{Colors.ENDC}")
    
    if killed_processes > 0:
        print(f"{Colors.GREEN}Successfully terminated {killed_processes} existing processes.{Colors.ENDC}")
        # Give some time for processes to fully terminate
        time.sleep(2)
    else:
        print(f"{Colors.BLUE}No existing server processes found or they were already terminated.{Colors.ENDC}")

def start_backend():
    """Start the Flask backend server"""
    print(f"{Colors.HEADER}Starting Flask backend server...{Colors.ENDC}")
    
    # Determine the Python executable to use
    python_executable = sys.executable
    
    # Start the Flask server
    try:
        backend_process = subprocess.Popen(
            [python_executable, "app.py"],
            cwd=BACKEND_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        processes.append(backend_process)
        print(f"{Colors.GREEN}Backend server started with PID: {backend_process.pid}{Colors.ENDC}")
        return backend_process
    except Exception as e:
        print(f"{Colors.RED}Error starting backend server: {e}{Colors.ENDC}")
        return None

def start_frontend():
    """Start the Next.js frontend server"""
    print(f"{Colors.HEADER}Starting Next.js frontend server...{Colors.ENDC}")
    
    # Check if npm or yarn is installed and available
    npm_cmd = "npm"
    npm_path = shutil.which("npm")
    yarn_path = shutil.which("yarn")
    
    if os.path.exists(os.path.join(FRONTEND_DIR, "yarn.lock")) and yarn_path:
        npm_cmd = "yarn"
        cmd_path = yarn_path
    elif npm_path:
        cmd_path = npm_path
    else:
        print(f"{Colors.RED}Error: Neither npm nor yarn was found in your PATH.{Colors.ENDC}")
        print(f"{Colors.YELLOW}Please make sure Node.js is installed and in your PATH.{Colors.ENDC}")
        return None
    
    # Start the Next.js server using the full path to npm/yarn
    try:
        frontend_process = subprocess.Popen(
            [cmd_path, "run", "dev"],
            cwd=FRONTEND_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        processes.append(frontend_process)
        print(f"{Colors.GREEN}Frontend server started with PID: {frontend_process.pid}{Colors.ENDC}")
        return frontend_process
    except Exception as e:
        print(f"{Colors.RED}Error starting frontend server: {e}{Colors.ENDC}")
        print(f"{Colors.YELLOW}Trying alternative method...{Colors.ENDC}")
        
        # Try using shell=True as a fallback (less secure but might work)
        try:
            cmd = f"{npm_cmd} run dev"
            frontend_process = subprocess.Popen(
                cmd,
                cwd=FRONTEND_DIR,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            
            processes.append(frontend_process)
            print(f"{Colors.GREEN}Frontend server started with PID: {frontend_process.pid}{Colors.ENDC}")
            return frontend_process
        except Exception as e2:
            print(f"{Colors.RED}Error starting frontend server (alternative method): {e2}{Colors.ENDC}")
            return None

def monitor_output(process, prefix):
    """Monitor and print the output of a process with a prefix"""
    if process is None:
        return
        
    color = Colors.BLUE if prefix == "Backend" else Colors.YELLOW
    
    try:
        for line in iter(process.stdout.readline, ""):
            if line:
                print(f"{color}[{prefix}]{Colors.ENDC} {line.strip()}")
        
        for line in iter(process.stderr.readline, ""):
            if line:
                print(f"{Colors.RED}[{prefix} ERROR]{Colors.ENDC} {line.strip()}")
    except Exception as e:
        print(f"{Colors.RED}Error monitoring {prefix} output: {e}{Colors.ENDC}")

def cleanup():
    """Clean up all processes when the script exits"""
    print(f"{Colors.HEADER}Shutting down servers...{Colors.ENDC}")
    
    for process in processes:
        if process and process.poll() is None:  # If process is still running
            try:
                # Try to terminate gracefully first
                if sys.platform == 'win32':
                    process.terminate()
                else:
                    os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                
                # Wait a bit for graceful termination
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                # If it doesn't terminate in time, kill it
                if sys.platform == 'win32':
                    process.kill()
                else:
                    os.killpg(os.getpgid(process.pid), signal.SIGKILL)
            except Exception as e:
                print(f"{Colors.RED}Error during cleanup: {e}{Colors.ENDC}")
    
    print(f"{Colors.GREEN}All servers have been shut down.{Colors.ENDC}")

def main():
    """Main function to start and monitor both servers"""
    # First kill any existing processes
    kill_existing_processes()
    
    # Register the cleanup function to be called on exit
    atexit.register(cleanup)
    
    # Handle keyboard interrupts
    def signal_handler(sig, frame):
        print(f"{Colors.YELLOW}Received keyboard interrupt. Shutting down...{Colors.ENDC}")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        # Start both servers
        backend_process = start_backend()
        if not backend_process:
            print(f"{Colors.RED}Failed to start backend server. Exiting.{Colors.ENDC}")
            sys.exit(1)
            
        time.sleep(2)  # Give the backend a moment to start
        
        frontend_process = start_frontend()
        
        if frontend_process is None:
            print(f"{Colors.RED}Failed to start frontend server. Only backend is running.{Colors.ENDC}")
            print(f"{Colors.BOLD}Backend URL: http://127.0.0.1:5000{Colors.ENDC}")
            print(f"{Colors.YELLOW}You can start the frontend manually with 'npm run dev' in another terminal.{Colors.ENDC}")
            print(f"{Colors.YELLOW}Press Ctrl+C to stop the backend server{Colors.ENDC}")
            
            # Just monitor the backend
            backend_thread = threading.Thread(target=monitor_output, args=(backend_process, "Backend"))
            backend_thread.daemon = True
            backend_thread.start()
            
            # Wait for backend process to complete
            backend_process.wait()
        else:
            print(f"{Colors.BOLD}{Colors.GREEN}Both servers are now running!{Colors.ENDC}")
            print(f"{Colors.BOLD}Backend URL: http://127.0.0.1:5000{Colors.ENDC}")
            print(f"{Colors.BOLD}Frontend URL: http://localhost:3000{Colors.ENDC}")
            print(f"{Colors.YELLOW}Press Ctrl+C to stop both servers{Colors.ENDC}")
            
            # Create threads to monitor output
            backend_thread = threading.Thread(target=monitor_output, args=(backend_process, "Backend"))
            frontend_thread = threading.Thread(target=monitor_output, args=(frontend_process, "Frontend"))
            
            backend_thread.daemon = True
            frontend_thread.daemon = True
            
            backend_thread.start()
            frontend_thread.start()
            
            # Keep the main thread alive
            while True:
                # Check if processes are still running
                if backend_process.poll() is not None:
                    print(f"{Colors.RED}Backend server has stopped unexpectedly.{Colors.ENDC}")
                    break
                
                if frontend_process.poll() is not None:
                    print(f"{Colors.RED}Frontend server has stopped unexpectedly.{Colors.ENDC}")
                    break
                
                time.sleep(1)
    
    except Exception as e:
        print(f"{Colors.RED}Error in main function: {e}{Colors.ENDC}")
        sys.exit(1)

if __name__ == "__main__":
    main()
