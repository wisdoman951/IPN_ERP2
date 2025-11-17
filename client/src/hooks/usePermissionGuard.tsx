import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import NoPermissionModal from '../components/NoPermissionModal';
import { getUserRole } from '../utils/authUtils';

type Role = 'admin' | 'basic' | 'therapist';

interface UsePermissionGuardOptions {
  disallowedRoles?: Role[];
  message?: string;
}

interface UsePermissionGuardResult {
  checkPermission: () => boolean;
  modal: ReactNode;
  userRole: Role | null;
  notifyNoPermission: () => void;
}

const resolveRole = (): Role | null => {
  const roleFromUtils = getUserRole();
  if (roleFromUtils) {
    return roleFromUtils;
  }
  const permission = localStorage.getItem('permission');
  if (permission === 'admin' || permission === 'basic' || permission === 'therapist') {
    return permission;
  }
  return null;
};

export const usePermissionGuard = (
  { disallowedRoles = ['therapist'], message = '無操作權限' }: UsePermissionGuardOptions = {}
): UsePermissionGuardResult => {
  const [showModal, setShowModal] = useState(false);
  const userRole = resolveRole();

  const handleClose = useCallback(() => setShowModal(false), []);
  const handleOpen = useCallback(() => setShowModal(true), []);
  const notifyNoPermission = useCallback(() => handleOpen(), [handleOpen]);

  const checkPermission = useCallback(() => {
    if (userRole && disallowedRoles.includes(userRole)) {
      notifyNoPermission();
      return false;
    }
    return true;
  }, [userRole, disallowedRoles, notifyNoPermission]);

  const modal = useMemo(
    () => (
      <NoPermissionModal show={showModal} onHide={handleClose} message={message} />
    ),
    [showModal, handleClose, message]
  );

  return { checkPermission, modal, userRole, notifyNoPermission };
};

export default usePermissionGuard;
