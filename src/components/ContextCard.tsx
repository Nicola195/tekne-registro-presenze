import { Operator, Nominativo, nomeCompleto } from '../model';
import { C, S } from '../ui';

type Kind = 'operatore' | 'utenza' | 'amministrazione';

interface Props {
  kind: Kind;
  operator?: Operator;
  nominativo?: Nominativo;
  utenzeCount?: number;
  onClick?: () => void; // se presente, la card è cliccabile (torna alla scelta del contesto)
}

/** Card di contesto mostrata in alto: indica come l'amministrazione sta operando.
 *  Cliccabile per tornare alla pagina di scelta (Operatore / Utenza / Amministrazione). */
export function ContextCard({ kind, operator, nominativo, utenzeCount = 0, onClick }: Props) {
  const accent = kind === 'operatore' ? C.primary : kind === 'utenza' ? C.conc : C.primaryDark;
  const eyebrow = kind === 'operatore' ? 'Operatore' : kind === 'utenza' ? 'Utenza' : 'Amministrazione';
  const title =
    kind === 'operatore' ? operator?.name || '—'
    : kind === 'utenza' ? (nominativo ? nomeCompleto(nominativo) : '—')
    : 'Amministrazione';
  const subtitle =
    kind === 'operatore'
      ? [operator?.ruolo, operator ? `${utenzeCount} ${utenzeCount === 1 ? 'utenza associata' : 'utenze associate'}` : ''].filter(Boolean).join(' · ')
      : kind === 'utenza' ? (nominativo?.terapia || 'Terapia non indicata')
      : 'Anagrafiche e gestione amministrativa';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      title={onClick ? 'Tocca per cambiare contesto' : undefined}
      style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 12, borderLeft: `5px solid ${accent}`, cursor: onClick ? 'pointer' : 'default' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: 0.5 }}>{eyebrow}</div>
        <div style={{ fontWeight: 800, fontSize: 18, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ ...S.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>
      </div>
      {onClick && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: accent, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
          Cambia<span style={{ fontSize: 18 }}>›</span>
        </div>
      )}
    </div>
  );
}
