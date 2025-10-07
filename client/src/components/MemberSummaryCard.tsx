import React from "react";
import { Card } from "react-bootstrap";
import { MemberData } from "../types/medicalTypes";
import { resolveMemberIdentityLabel } from "../utils/memberIdentity";

interface MemberSummaryCardProps {
  member: MemberData | null;
  memberCode?: string;
  fallbackName?: string;
  className?: string;
  hideHeader?: boolean;
}

const displayOrDash = (value?: string | null) => {
  if (!value) {
    return "-";
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "-";
};

const MemberSummaryCard: React.FC<MemberSummaryCardProps> = ({
  member,
  memberCode,
  fallbackName,
  className,
  hideHeader = false,
}) => {
  const name = displayOrDash(member?.name ?? fallbackName);
  const identity = displayOrDash(
    resolveMemberIdentityLabel(member?.identity_type ?? undefined),
  );
  const code = displayOrDash(member?.member_code ?? memberCode);
  const note = displayOrDash(member?.note ?? undefined);

  return (
    <Card className={className}>
      {!hideHeader && (
        <Card.Header className="bg-light fw-semibold">會員基本資料</Card.Header>
      )}
      <Card.Body>
        <div className="mb-3">
          <div className="text-muted small">姓名</div>
          <div className="fw-semibold">{name}</div>
        </div>
        <div className="mb-3">
          <div className="text-muted small">身分別</div>
          <div className="fw-semibold">{identity}</div>
        </div>
        <div className="mb-3">
          <div className="text-muted small">會員編號</div>
          <div className="fw-semibold">{code}</div>
        </div>
        <div>
          <div className="text-muted small">備註</div>
          <div className="fw-semibold" style={{ whiteSpace: "pre-wrap" }}>{note}</div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default MemberSummaryCard;
