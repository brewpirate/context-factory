import subprocess, uuid, shutil

def clone_session(base_session_id, task):
    # copy session files to pure
    fork_id = str(uuid.uuid4())
    shutil.copytree(f"sessions/{base_session_id}", f"sessions/{fork_id}")
    
    # launch claude with forked session
    result = subprocess.run([
        "claude", "-p", task,
        "--resume", base_session_id,
        "--fork-session"
    ], capture_output=True, text=True)
    
    # on completion, copy back + write .online
    shutil.copytree(f"sessions/{fork_id}", f"sessions/{base_session_id}")
    open(".online", "w").close()
    
    return result