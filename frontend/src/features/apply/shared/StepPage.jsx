import { Card, CardBody, CardHeader } from '../../../components/ui';

/** Her adımın ortak çerçevesi: başlık + açıklama + kart içeriği + alt butonlar */
export default function StepPage({ step, title, description, children, footer, aside }) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader eyebrow={`Adım ${step} / 7`} title={title} description={description} />
        <CardBody className="space-y-6">{children}</CardBody>
        {footer}
      </Card>
      {aside}
    </div>
  );
}
