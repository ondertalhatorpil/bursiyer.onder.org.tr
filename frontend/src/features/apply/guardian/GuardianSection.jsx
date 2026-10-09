import { useState } from 'react';
import { CircleCheck, PencilLine, UsersRound } from 'lucide-react';
import { Alert, Button, Card, CardBody, CardHeader } from '../../../components/ui';
import { OtpVerify } from '../../../components/auth';
import GuardianForm from './GuardianForm';
import { applicationApi } from '../../../api/endpoints';
import { useApplicationUpdater } from '../../../hooks/useApplication';

/**
 * 18 yaş altı adaylar için veli / vasi onayı:
 *   bilgiler -> velinin telefonuna kod -> kod -> onaylandı
 */
export default function GuardianSection({ application }) {
  const update = useApplicationUpdater();
  const guardian = application.guardian;
  const [editing, setEditing] = useState(!guardian?.verified);
  const [flow, setFlow] = useState(null);

  const save = async (values) => {
    const res = await applicationApi.saveGuardian(values);
    if (res.alreadyVerified) {
      update(res.application);
      setEditing(false);
      return;
    }
    setFlow(res);
  };

  const verify = async (code) => {
    const res = await applicationApi.verifyGuardian(code);
    update(res.application);
    setFlow(null);
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader
        eyebrow="18 yaşından küçük adaylar"
        title="Veli / Vasi Onayı"
        description="Başvurunuzun geçerli olması için velinizin bilgileri ve telefonuna gönderilen kodla onayı gerekir."
      />
      <CardBody>
        {guardian?.verified && !editing ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-emerald-50 p-4 ring-1 ring-inset ring-emerald-200">
            <div className="flex items-start gap-3">
              <CircleCheck className="mt-0.5 size-5 text-emerald-600" aria-hidden />
              <div className="text-sm">
                <p className="font-semibold text-emerald-900">Veli onayı alındı</p>
                <p className="mt-0.5 text-emerald-800">{guardian.fullName} · {guardian.phoneMasked}</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" icon={PencilLine} onClick={() => setEditing(true)}>Değiştir</Button>
          </div>
        ) : flow ? (
          <OtpVerify
            info={flow}
            onVerify={verify}
            onResend={applicationApi.resendGuardian}
            onBack={() => setFlow(null)}
            submitLabel="Veli Onayını Tamamla"
          />
        ) : (
          <div className="space-y-5">
            {!guardian && (
              <Alert variant="info">
                <span className="inline-flex items-center gap-2"><UsersRound className="size-4" aria-hidden /> Veliniz yanınızda değilse kod geldiğinde size iletmesini isteyebilirsiniz.</span>
              </Alert>
            )}
            {guardian && !guardian.verified && (
              <Alert variant="warning">Veli onayı henüz tamamlanmadı. Bilgileri kontrol edip kodu tekrar gönderiniz.</Alert>
            )}
            <GuardianForm
              defaultValues={guardian ? { fullName: guardian.fullName, idType: guardian.idType, idNumber: '', phone: '' } : undefined}
              onSubmit={save}
            />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
