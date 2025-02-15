import threading
import cv2

# 스레드 로컬 저장소 설정
thread_local = threading.local()


def get_thread_local_cv2():
    """스레드별 OpenCV 컨텍스트 관리"""
    if not hasattr(thread_local, "cv2_initialized"):
        thread_local.cv2_initialized = True
        cv2.ocl.setUseOpenCL(True)
    return True


def try_gpu_operation(operation_func, fallback_func=None):
    """GPU 연산을 시도하고 실패시 CPU로 폴백하는 데코레이터"""
    try:
        get_thread_local_cv2()
        return operation_func()
    except Exception as e:
        print(f"Warning: GPU operation failed, falling back to CPU: {str(e)}")
        if fallback_func:
            return fallback_func()
        return None


def to_gpu_mat(img):
    """이미지를 GPU 메모리로 전송"""
    try:
        return cv2.UMat(img)
    except Exception as e:
        print(f"Warning: Failed to transfer to GPU: {str(e)}")
        return img


def from_gpu_mat(mat):
    """GPU 메모리의 이미지를 CPU 메모리로 전송"""
    if isinstance(mat, cv2.UMat):
        return mat.get()
    return mat
