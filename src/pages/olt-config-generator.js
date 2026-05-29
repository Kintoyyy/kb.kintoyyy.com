import React, { useState, useCallback } from 'react';
import Layout from '@theme/Layout';
import styles from './olt-config-generator.module.css';

const TEMPLATES = [
  {
    key: 'vsol_1pon_allvlan', name: 'VSOL 1 PON · ALL VLAN',
    desc: 'Single gemport, INTERNET tag of vlan 1 + range.',
    fields: { start: 10, end: 200, rangeSize: 10, id: 2 },
    gen: (p) => {
      let t = '';
      for (let i = +p.start; i < +p.end; i += +p.rangeSize) {
        let r = i + +p.rangeSize - 1;
        if (r > +p.end) r = +p.end;
        t += `profile line id ${p.id++} name vlan_${i}-${r}_internet
  tcont 1 dba default1
    gemport 1 tcont 1 gemport_name gem_1
      service INTERNET gemport 1 tag 1,${i}-${r}
commit
exit
!\n`;
      }
      return t;
    },
  },
  {
    key: 'vsol_1pon_untag', name: 'VSOL 1 PON · UNTAG INTERNET',
    desc: 'gem_1 INTERNET untag vlan 1, gem_2 tagged range + internet vlan.',
    fields: { start: 10, end: 200, rangeSize: 10, id: 2, internet: 5 },
    gen: (p) => {
      let t = '';
      for (let i = +p.start; i < +p.end; i += +p.rangeSize) {
        let r = i + +p.rangeSize - 1;
        if (r > +p.end) r = +p.end;
        t += `profile line id ${p.id++} name vlan_${i}-${r}_internet_untag
  tcont 1 dba default1
    gemport 1 tcont 1 gemport_name gem_1
      service INTERNET gemport 1 untag vlan 1
    gemport 2 tcont 1 gemport_name gem_2
      service VLAN gemport 2 tag ${i}-${r},${p.internet}
commit
exit
!\n`;
      }
      return t;
    },
  },
  {
    key: 'vsol_8pon_allvlan', name: 'VSOL 2-8 PON · ALL VLAN',
    desc: 'gem_1 INTERNET on a tagged vlan, gem_2 transparent VLAN range.',
    fields: { start: 10, end: 200, rangeSize: 10, internet: 5, id: 2 },
    gen: (p) => {
      let t = '';
      for (let i = +p.start; i < +p.end; i += +p.rangeSize) {
        let r = i + +p.rangeSize - 1;
        if (r > +p.end) r = +p.end;
        t += `profile line id ${p.id++} name vlan_${i}-${r}_internet_${p.internet}
  tcont 1 dba default1
    gemport 1 tcont 1 gemport_name gem_1
      service INTERNET gemport 1 vlan ${p.internet}
      service-port 1 gemport 1 uservlan ${p.internet} vlan ${p.internet}
    gemport 2 tcont 1 gemport_name gem_2
      service VLAN gemport 2 vlan ${i}-${r}
      service-port 2 gemport 2 uservlan ${i} to ${r} transparent
commit
exit
!\n`;
      }
      return t;
    },
  },
  {
    key: 'vsol_8pon_untag', name: 'VSOL 2-8 PON · UNTAG INTERNET',
    desc: 'gem_1 INTERNET untagged, gem_2 transparent VLAN range.',
    fields: { start: 10, end: 200, rangeSize: 10, id: 2 },
    gen: (p) => {
      let t = '';
      for (let i = +p.start; i < +p.end; i += +p.rangeSize) {
        let r = i + +p.rangeSize - 1;
        if (r > +p.end) r = +p.end;
        t += `profile line id ${p.id++} name vlan_${i}-${r}_internet_untag
  tcont 1 dba default1
    gemport 1 tcont 1 gemport_name gem_1
      service INTERNET gemport 1 untag
      service-port 1 gemport 1 uservlan untag vlan 1
    gemport 2 tcont 1 gemport_name gem_2
      service VLAN gemport 2 vlan ${i}-${r}
      service-port 2 gemport 2 uservlan ${i} to ${r} transparent
commit
exit
!\n`;
      }
      return t;
    },
  },
  {
    key: 'vsol_8pon_untag_vlan1', name: 'VSOL 2-8 PON · UNTAG + VLAN1',
    desc: 'gem_1 INTERNET untagged, gem_2 carries range + internet vlan service-port.',
    fields: { start: 10, end: 200, rangeSize: 10, id: 2, internet: 5 },
    gen: (p) => {
      let t = '';
      for (let i = +p.start; i < +p.end; i += +p.rangeSize) {
        let r = i + +p.rangeSize - 1;
        if (r > +p.end) r = +p.end;
        t += `profile line id ${p.id++} name vlan_${i}-${r}_internet_untag_vlan1
  tcont 1 dba default1
    gemport 1 tcont 1 gemport_name gem_1
      service INTERNET gemport 1 untag
      service-port 1 gemport 1 uservlan untag vlan 1
    gemport 2 tcont 1 gemport_name gem_2
      service VLAN gemport 2 vlan ${i}-${r},${p.internet}
      service-port 2 gemport 2 uservlan ${i} to ${r} transparent
      service-port 3 gemport 2 uservlan ${p.internet} vlan ${p.internet}
commit
exit
!\n`;
      }
      return t;
    },
  },
  {
    key: 'vsol_8pon_samegem', name: 'VSOL 2-8 PON · SAME GEMPORT',
    desc: 'Single gemport carrying internet vlan + range, split uservlan service-ports.',
    fields: { start: 10, end: 200, rangeSize: 10, id: 2, internet: 5 },
    gen: (p) => {
      let t = '';
      for (let i = +p.start; i < +p.end; i += +p.rangeSize) {
        let r = i + +p.rangeSize - 1;
        if (r > +p.end) r = +p.end;
        t += `profile line id ${p.id++} name vlan_${i}-${r}_internet
  tcont 1 name tcont_1 dba default1
    gemport 1 tcont 1 gemport_name gem_1
      service INTERNET gemport 1 vlan ${p.internet},${i}-${r}
      service-port 1 gemport 1 uservlan ${p.internet} vlan ${p.internet}
      service-port 2 gemport 1 uservlan ${i} to ${r} transparent
commit
exit
!\n`;
      }
      return t;
    },
  },
  {
    key: 'vsol_16pon_vlan', name: 'VSOL 16 PON · VLAN INTERNET',
    desc: 'Per-VLAN profile (one vlan each), single gemport internet + vlan service-ports.',
    fields: { start: 10, end: 200, id: 2, internet: 5 },
    gen: (p) => {
      let t = '';
      for (let i = +p.start; i < +p.end; i++) {
        t += `profile line id ${p.id++} name vlan_${i}_internet_${p.internet}
  tcont 1 name tcont_1 dba default1
    gemport 1 tcont 1 gemport_name gem_1
      service INTERNET gemport 1 vlan ${p.internet},${i}
      service-port 1 gemport 1 uservlan ${p.internet} vlan ${p.internet}
      service-port 2 gemport 1 uservlan ${i} vlan ${i}
commit
exit
!\n`;
      }
      return t;
    },
  },
  {
    key: 'vsol_16pon_untag', name: 'VSOL 16 PON · UNTAG INTERNET',
    desc: 'Per-VLAN profile, gem_1 untagged internet, gem_2 single vlan.',
    fields: { start: 10, end: 200, id: 2, internet: 5 },
    gen: (p) => {
      let t = '';
      for (let i = +p.start; i < +p.end; i++) {
        t += `profile line id ${p.id++} name vlan_${i}_internet_untag
  tcont 1 name tcont_1 dba default1
    gemport 1 tcont 1 gemport_name gem_1
      service INTERNET gemport 1 untag
      service-port 1 gemport 1 uservlan untag vlan 1
    gemport 2 tcont 1 gemport_name gem_2
      service VLAN gemport 2 vlan ${i}
      service-port 2 gemport 2 uservlan ${i} vlan ${i}
commit
exit
!\n`;
      }
      return t;
    },
  },
  {
    key: 'bdcom', name: 'BDCom OLT · flow-mapping',
    desc: 'BDCom onu-flow-mapping profile. entry 1 all eth-uni, entry 2 mapped to VLAN range.',
    fields: { start: 10, end: 200, rangeSize: 10, id: 2 },
    gen: (p) => {
      let t = '';
      for (let i = +p.start; i < +p.end; i += +p.rangeSize) {
        let r = i + +p.rangeSize - 1;
        if (r > +p.end) r = +p.end;
        t += `gpon profile onu-flow-mapping flow-map-vlan-${i}-${r} id ${p.id++}
 gpon-profile entry 1 uni type eth-uni all
 gpon-profile entry 1 virtual-port 1
 gpon-profile entry 2 uni type eth-uni all
 gpon-profile entry 2 vlan ${i}-${r}
 gpon-profile entry 2 virtual-port 1
!\n`;
      }
      return t;
    },
  },
  {
    key: 'vendo_json', name: 'Vendo · JSON block',
    desc: 'Per-vendo JSON entries. The counter maps to the 3rd octet; when it exceeds 255 it carries into the 2nd octet so IPs stay valid. Set base (1st octet + starting 2nd octet), vendo host, and gateway host.',
    fields: { start: 151, end: 199 },
    textFields: { base: '10.0', vendoHost: '2', gwHost: '1' },
    gen: (p) => {
      let t = '';
      const parts = String(p.base).split('.');
      const o1 = parts[0] || '10';
      const baseO2 = +(parts[1] || 0);
      for (let i = +p.start; i <= +p.end; i++) {
        const o2 = baseO2 + Math.floor(i / 256);
        const o3 = i % 256;
        t += `    {
        vendoName: "VENDO ${i}",
        vendoIp: "${o1}.${o2}.${o3}.${p.vendoHost}",
        hotspotAddress: "${o1}.${o2}.${o3}.${p.gwHost}",
        interfaceName: "vlan${i}",
        enableEload: false,
        enableFreeMovies: true,
        enableVoucherVault: true,
        voucherMode: false
    },\n`;
      }
      return t;
    },
  },
];

const FIELD_LABELS = {
  start: 'Start VLAN',
  end: 'End VLAN',
  rangeSize: 'Range size',
  id: 'Starting profile ID',
  internet: 'Internet VLAN',
  base: 'IP base (1st.2nd octet)',
  vendoHost: 'Vendo host (last octet)',
  gwHost: 'Gateway host (last octet)',
};

function getOutput(tpl, params) {
  const p = { ...params };
  if ('rangeSize' in tpl.fields) {
    const rs = +p.rangeSize;
    if (!rs || rs < 2) return '';
  }
  return tpl.gen(p);
}

function countProfiles(out) {
  return (out.match(/^!/gm) || []).length || (out.match(/},/g) || []).length;
}

function initParams() {
  return TEMPLATES.map(tpl => ({
    ...tpl.fields,
    ...(tpl.textFields || {}),
  }));
}

export default function OltConfigGenerator() {
  const [activeTab, setActiveTab] = useState(0);
  const [params, setParams] = useState(initParams);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1600);
  }, []);

  const handleChange = (tplIdx, field, value, isText) => {
    setParams(prev => {
      const next = [...prev];
      if (isText) {
        next[tplIdx] = { ...next[tplIdx], [field]: value };
      } else {
        if (value === '') return prev;
        const v = +value;
        if (isNaN(v)) return prev;
        const clamped = field === 'rangeSize' ? Math.min(11, Math.max(2, v)) : v;
        next[tplIdx] = { ...next[tplIdx], [field]: clamped };
      }
      return next;
    });
  };

  const handleCopy = (idx) => {
    const out = getOutput(TEMPLATES[idx], params[idx]);
    navigator.clipboard.writeText(out).then(() => toast('Copied to clipboard'));
  };

  const handleDownload = (idx) => {
    const out = getOutput(TEMPLATES[idx], params[idx]);
    const b = new Blob([out], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = TEMPLATES[idx].key + '.sh';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Downloaded');
  };

  return (
    <Layout title="OLT Config Generator">
      <main className="container margin-vert--lg">
        <header>
          <h1>Config Generator</h1>
          <p className="padding-bottom--md">
            Adjust the inputs — config regenerates live. No more editing scripts. Just copy.
          </p>
        </header>

        <div className="row">
          <div className="col col--3">
            <div className={styles.tabs}>
              {TEMPLATES.map((tpl, idx) => (
                <button
                  key={tpl.key}
                  className={`${styles.tab}${idx === activeTab ? ` ${styles.tabActive}` : ''}`}
                  onClick={() => setActiveTab(idx)}
                >
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>

          <div className="col col--9">
            {TEMPLATES.map((tpl, idx) => {
              const out = getOutput(tpl, params[idx]);
              const count = countProfiles(out);
              const lines = out.split('\n').length - 1;
              const isActive = idx === activeTab;

              return (
                <div
                  key={tpl.key}
                  className={isActive ? styles.panelActive : styles.panel}
                  aria-hidden={!isActive}
                >
                  <div className={styles.controls}>
                    <h3>Parameters</h3>
                    {Object.keys(tpl.fields).map(k => (
                      <div key={k} className={styles.field}>
                        <label>{FIELD_LABELS[k] || k}</label>
                        <input
                          type="number"
                          value={params[idx][k]}
                          min={k === 'rangeSize' ? 2 : undefined}
                          max={k === 'rangeSize' ? 11 : undefined}
                          onChange={e => handleChange(idx, k, e.target.value, false)}
                        />
                      </div>
                    ))}
                    {tpl.textFields && Object.keys(tpl.textFields).map(k => (
                      <div key={k} className={styles.field}>
                        <label>{FIELD_LABELS[k] || k}</label>
                        <input
                          type="text"
                          value={params[idx][k]}
                          onChange={e => handleChange(idx, k, e.target.value, true)}
                        />
                      </div>
                    ))}
                    <div className={styles.desc}>{tpl.desc}</div>
                  </div>

                  <div className={styles.output}>
                    <div className={styles.outputBar}>
                      <div className={styles.meta}>
                        <b>{count}</b> profiles · <span>{lines}</span> lines
                      </div>
                      <div className={styles.btns}>
                        <button className={styles.btn} onClick={() => handleCopy(idx)}>Copy</button>
                        <button className={`${styles.btn} ${styles.ghost}`} onClick={() => handleDownload(idx)}>
                          Download .sh
                        </button>
                      </div>
                    </div>
                    <pre className={styles.pre}>{out}</pre>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${styles.toast}${toastVisible ? ` ${styles.toastShow}` : ''}`}>
          {toastMsg}
        </div>
      </main>
    </Layout>
  );
}
