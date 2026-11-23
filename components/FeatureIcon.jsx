export default function FeatureIcon({name,className='h-6 w-6'}) {
  const common={className,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true}
  const icons={
    scan:<><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M7 7h4v4H7zM13 7h4v4h-4zM7 13h4v4H7zM14 14h3v3h-3z"/></>,
    photos:<><rect x="3" y="5" width="14" height="14" rx="2"/><path d="m5 16 4-4 3 3 2-2 3 3M8 9h.01M7 3h13a1 1 0 0 1 1 1v13"/></>,
    notifications:<><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-2 2v-9.5A7.5 7.5 0 0 1 10.5 4H12"/><path d="M15 3h6v6h-6zM15 6h6M18 3v6"/></>,
    meeting:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h7"/></>,
    excuse:<><path d="M7 3h8l4 4v14H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"/><path d="M15 3v5h5M8 12h7M8 16h5"/></>,
    spiritual:<><path d="M12 2.5v19M3.5 9.5h17M8 2.5h8M8 21.5h8M3.5 6.5v6M20.5 6.5v6"/></>,
    chats:<><path d="M21 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-9.5A7.5 7.5 0 0 1 10.5 4H13"/><path d="M16 3h5v5M21 3l-7 7"/></>,
    profile:<><circle cx="12" cy="8" r="3.5"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
    admin:<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/></>
  }
  return <svg {...common}>{icons[name]||icons.notifications}</svg>
}