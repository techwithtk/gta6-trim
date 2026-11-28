"use client";

import { TEMPLATES, type TemplateId } from "@/lib/templates";

/** Mini phone previews of each Shorts template, drawn with plain boxes so they load instantly. */
function Preview({ id }: { id: TemplateId }) {
  const cap = <span className="absolute inset-x-[18%] h-[5%] rounded-[1px] bg-white/90" style={{ boxShadow: "0 0 0 1px #000" }} />;
  const video = "bg-gradient-to-br from-sky-400/80 via-emerald-500/70 to-amber-500/70";
  switch (id) {
    case "auto":
      return (<>
        <span className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-br from-rose-300/80 to-orange-300/70" />
        <span className={`absolute inset-x-0 bottom-0 h-[60%] ${video}`} />
        <span className="absolute inset-x-[18%] top-[38%] h-[5%] rounded-[1px] bg-white/90" />
      </>);
    case "full":
      return (<><span className={`absolute inset-0 ${video}`} /><span className="absolute inset-x-[18%] top-[64%] h-[5%] rounded-[1px] bg-white/90" /></>);
    case "blur":
      return (<>
        <span className={`absolute inset-0 ${video} opacity-50 blur-[2px]`} />
        <span className={`absolute inset-x-0 top-[34%] h-[32%] ${video}`} />
        <span className="absolute inset-x-[18%] top-[71%] h-[5%] rounded-[1px] bg-white/90" />
      </>);
    case "headline":
      return (<>
        <span className="absolute inset-0 bg-black" />
        <span className="absolute inset-x-[14%] top-[16%] h-[7%] bg-pink" />
        <span className={`absolute inset-x-0 top-[31%] h-[32%] ${video}`} />
        <span className="absolute inset-x-[18%] top-[70%] h-[5%] rounded-[1px] bg-white/90" />
      </>);
    case "meme":
      return (<>
        <span className="absolute inset-0 bg-white" />
        <span className="absolute inset-x-[16%] top-[15%] h-[3%] bg-black/80" /><span className="absolute inset-x-[24%] top-[20%] h-[3%] bg-black/80" />
        <span className={`absolute inset-x-0 top-[33%] h-[32%] ${video}`} />
        <span className="absolute inset-x-[18%] top-[72%] h-[5%] rounded-[1px] bg-black/70" />
      </>);
    case "cinematic":
      return (<>
        <span className="absolute inset-0 bg-black" />
        <span className={`absolute inset-x-0 top-[34%] h-[32%] ${video}`} />
        <span className="absolute inset-x-[18%] top-[72%] h-[5%] rounded-[1px] bg-white/90" />
      </>);
  }
  return cap;
}

export function TemplatePicker({ value, onChange }: { value: TemplateId; onChange: (v: TemplateId) => void }) {
  const current = TEMPLATES.find((t) => t.id === value) ?? TEMPLATES[0];
  return (
    <div>
      <span className="mb-2 block text-sm font-medium">Template</span>
      <div role="radiogroup" aria-label="Shorts template" className="grid grid-cols-6 gap-1.5 sm:gap-2">
        {TEMPLATES.map((t) => {
          const on = t.id === value;
          return (
            <button key={t.id} type="button" role="radio" aria-checked={on} aria-label={t.name} title={`${t.name}: ${t.desc}`} onClick={() => onChange(t.id)}
              className={`group flex flex-col items-center gap-1 outline-none`}>
              <span className={`relative block aspect-[9/16] w-full overflow-hidden border-2 transition-colors duration-150 ${on ? "border-pink shadow-[2px_2px_0_var(--pink)]" : "border-white/20 group-hover:border-white/50 group-focus-visible:border-white/70"}`}>
                <Preview id={t.id} />
              </span>
              <span className={`w-full truncate text-center text-[10px] leading-tight ${on ? "font-semibold text-text" : "text-subtle"}`}>{t.name}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] text-subtle">{current.desc}.</p>
    </div>
  );
}
