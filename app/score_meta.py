"""Metadados e miniatura de um arranjo, derivados do JSON `score_data`.

O `score_data` não tem schema fixo (arranjos antigos podem não ter vários campos),
então toda leitura aqui tolera chaves ausentes.
"""
from typing import Any, Dict, List, Optional

from markupsafe import Markup

PREVIEW_MAX_MEASURES = 5
PREVIEW_MAX_ROWS = 7
DEFAULT_SUBDIVISIONS = {"4/4": (4, 4), "2/4": (2, 4), "3/4": (3, 4), "5/4": (5, 4), "7/4": (7, 4),
                        "6/8": (2, 3), "9/8": (3, 3), "12/8": (4, 3)}  # (tempos, subdivisões por tempo)


def _as_dict(score_data: Any) -> Dict[str, Any]:
    return score_data if isinstance(score_data, dict) else {}


def _measure_signatures(data: Dict[str, Any], count: int) -> List[str]:
    default_sig = data.get("timeSignature") or "4/4"
    configs = data.get("measuresConfig") or []
    signatures = []
    for i in range(count):
        config = configs[i] if i < len(configs) and isinstance(configs[i], dict) else {}
        signatures.append(config.get("timeSignature") or default_sig)
    return signatures


def _unique_instruments(instruments: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """Um item por tipo de instrumento (3 caixas viram 1), na ordem em que aparecem."""
    unique: List[Dict[str, str]] = []
    seen = set()
    for inst in instruments:
        icon = inst.get("iconSvg", "")
        key = icon or str(inst.get("id", "")).split("_")[0]
        if key in seen:
            continue
        seen.add(key)
        unique.append({"id": inst.get("id", ""), "nome": inst.get("name", ""), "icone": icon})
    return unique


def get_arrangement_meta(score_data: Any) -> Dict[str, Any]:
    data = _as_dict(score_data)
    instruments = [i for i in (data.get("instruments") or []) if isinstance(i, dict)]

    count = data.get("measuresCount")
    if not isinstance(count, int) or count < 1:
        count = max((len(i.get("pattern") or []) for i in instruments), default=1) or 1

    signatures = _measure_signatures(data, count)
    unique_sigs = sorted(set(signatures), key=signatures.index)

    try:
        bpm = int(data.get("bpm") or 0)
    except (TypeError, ValueError):
        bpm = 0

    return {
        "compassos": count,
        "bpm": bpm,
        "metricas": unique_sigs,
        "metrica": unique_sigs[0] if len(unique_sigs) == 1 else "Misto",
        "instrumentos": _unique_instruments(instruments),
    }


def _fmt(value: float) -> str:
    """Número curto para o SVG (sem zeros inúteis): 12.0 -> "12", 10.5 -> "10.5"."""
    return f"{value:.1f}".rstrip("0").rstrip(".")


def render_score_preview(score_data: Any) -> Markup:
    """Mini-grade em SVG: uma linha por instrumento, um ponto por nota (primeiros compassos).

    Todas as notas vão em um único <path> (pontos "M x y h0" com traço arredondado) e as linhas-guia
    em outro: o HTML fica ~6x menor que com um <circle> por nota (a biblioteca lista vários arranjos).
    """
    data = _as_dict(score_data)
    instruments = [i for i in (data.get("instruments") or []) if isinstance(i, dict)][:PREVIEW_MAX_ROWS]
    if not instruments:
        return Markup("")

    count = min(PREVIEW_MAX_MEASURES, get_arrangement_meta(data)["compassos"])
    signatures = _measure_signatures(data, count)

    step_w, row_h = 4, 8
    height = len(instruments) * row_h
    dots: List[str] = []
    separators: List[str] = []
    x_offset = 0
    for m, sig in enumerate(signatures):
        beats, subs = DEFAULT_SUBDIVISIONS.get(sig, (4, 4))
        if m > 0:
            separators.append(f"M{x_offset * step_w} 0V{height}")
        for r, inst in enumerate(instruments):
            pattern = inst.get("pattern") or []
            measure = pattern[m] if m < len(pattern) and isinstance(pattern[m], list) else []
            cy = _fmt(r * row_h + row_h / 2)
            for b in range(beats):
                beat = measure[b] if b < len(measure) and isinstance(measure[b], dict) else None
                beat_subs = (beat or {}).get("subdivisions") or subs
                notes = (beat or {}).get("notes") or []
                for s, stroke in enumerate(notes[:beat_subs]):
                    if stroke and stroke != "empty":
                        cx = (x_offset + b * subs + s * subs / beat_subs) * step_w + step_w / 2
                        dots.append(f"M{_fmt(cx)} {cy}h0")
        x_offset += beats * subs

    width = max(x_offset * step_w, 1)

    # Linhas-guia (uma por instrumento) para a miniatura não ficar vazia em arranjos sem notas
    guides = "".join(f"M0 {_fmt(r * row_h + row_h / 2)}H{width}" for r in range(len(instruments)))

    parts = [f'<path d="{guides}" stroke="currentColor" stroke-opacity=".14" fill="none"/>']
    if separators:
        parts.append(f'<path d="{"".join(separators)}" stroke="currentColor" stroke-opacity=".18" fill="none"/>')
    if dots:
        parts.append(
            f'<path d="{"".join(dots)}" stroke="currentColor" stroke-width="3.2" '
            f'stroke-linecap="round" fill="none"/>'
        )

    return Markup(
        f'<svg class="lib-card-preview" viewBox="0 0 {width} {height}" '
        f'preserveAspectRatio="xMidYMid meet" aria-hidden="true">{"".join(parts)}</svg>'
    )
