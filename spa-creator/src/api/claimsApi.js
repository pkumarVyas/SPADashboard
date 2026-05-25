const MOCK            = import.meta.env.VITE_MOCK === 'true';
const CLAIMS_DATA_URL = import.meta.env.VITE_CLAIMS_DATA_URL || '/api/GetClaimsData';

export async function getClaimsData() {
  if (MOCK) {
    await new Promise(r => setTimeout(r, 400));
    return {
      success: true,
      kpis: {
        totalClaimed:  { label: '$1.34M', raw: 1340000 },
        totalPaid:     { label: '$1.08M', raw: 1080000 },
        outstanding:   { label: '$260K',  raw: 260000  },
        payRate:       { label: '80.6%',  raw: 80.6    },
        avgDaysToPay:  { label: '34 d',   raw: 34      },
      },
      chartData: [
        { month:'Jun', claimed:760,  paid:710  },
        { month:'Jul', claimed:870,  paid:770  },
        { month:'Aug', claimed:1055, paid:1050 },
        { month:'Sep', claimed:1045, paid:785  },
        { month:'Oct', claimed:1200, paid:1005 },
        { month:'Nov', claimed:1300, paid:1075 },
        { month:'Dec', claimed:1400, paid:1110 },
        { month:'Jan', claimed:920,  paid:880  },
        { month:'Feb', claimed:1100, paid:940  },
        { month:'Mar', claimed:1250, paid:1020 },
        { month:'Apr', claimed:1380, paid:1100 },
        { month:'May', claimed:1420, paid:1080 },
      ],
      vendors: [
        { vendor:'HARBOR',    claimed:420000, paid:380000, claimedFmt:'$420K', paidFmt:'$380K' },
        { vendor:'1001',      claimed:310000, paid:270000, claimedFmt:'$310K', paidFmt:'$270K' },
        { vendor:'AD-101',    claimed:220000, paid:190000, claimedFmt:'$220K', paidFmt:'$190K' },
        { vendor:'Parker_US', claimed:180000, paid:160000, claimedFmt:'$180K', paidFmt:'$160K' },
        { vendor:'Schneider', claimed:130000, paid:100000, claimedFmt:'$130K', paidFmt:'$100K' },
      ],
      statusBreakdown: [
        { status:'Posted',   count:412, amount:890000, amountFmt:'$890K', pct:66 },
        { status:'Open',     count:148, amount:280000, amountFmt:'$280K', pct:21 },
        { status:'Disputed', count:52,  amount:110000, amountFmt:'$110K', pct:8  },
        { status:'Settled',  count:34,  amount:60000,  amountFmt:'$60K',  pct:4  },
      ],
      agingBuckets: [
        { label:'0–30 d',  c:142, amountFmt:'$480K', pct:92, tier:'low',  danger:false },
        { label:'31–60 d', c:88,  amountFmt:'$312K', pct:62, tier:'med',  danger:false },
        { label:'61–90 d', c:34,  amountFmt:'$127K', pct:28, tier:'high', danger:false },
        { label:'90+ d',   c:11,  amountFmt:'$44K',  pct:10, tier:'crit', danger:true  },
      ],
      recentClaims: [],
      counts: { journal: 646, payments: 580, trans: 612 },
    };
  }

  const res  = await fetch(CLAIMS_DATA_URL);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
  return json;
}
