import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={styles.heroBanner}>
      <div className={styles.heroContent}>
        <Heading as="h1" className={styles.heroTitle}>
          📚 {siteConfig.title}
        </Heading>
        <p className={styles.heroSubtitle}>
          Practical guides for Network Infrastructure, Virtualization & ISP Systems
        </p>
        <p className={styles.heroDescription}>
          Expert-written documentation for deploying and managing MikroTik routers, Proxmox hypervisors, and advanced networking solutions.
        </p>
        <div className={styles.buttonGroup}>
          <Link
            className={styles.primaryButton}
            to="/docs/intro">
            📖 Explore Documentation
          </Link>
          <Link
            className={styles.secondaryButton}
            to="/docs/category/mikrotik">
            🔧 MikroTik Guides
          </Link>
        </div>

        <div className={styles.statsContainer}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>27+</div>
            <div className={styles.statLabel}>MikroTik Guides</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>4+</div>
            <div className={styles.statLabel}>Proxmox Guides</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>100%</div>
            <div className={styles.statLabel}>Tested & Production Ready</div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - Network Infrastructure Knowledge Base`}
      description="Comprehensive guides for MikroTik, Proxmox, and advanced networking solutions. Real-world procedures, tested in production.">
      <HomepageHeader />
      <main>
        {/* <HomepageFeatures /> */}
        
        {/* Technologies Section */}
        <section className={styles.technologiesSection}>
          <div className="container">
            <Heading as="h2" className={styles.techTitle}>
              Technologies Covered
            </Heading>
            <div className={styles.techGrid}>
              <div className={styles.techBadge}>
                <span className={styles.techIcon}>🔵</span>
                <span>MikroTik</span>
              </div>
              <div className={styles.techBadge}>
                <span className={styles.techIcon}>🟪</span>
                <span>Proxmox</span>
              </div>
              <div className={styles.techBadge}>
                <span className={styles.techIcon}>🐘</span>
                <span>Docker</span>
              </div>
              <div className={styles.techBadge}>
                <span className={styles.techIcon}>🟢</span>
                <span>Linux</span>
              </div>
              <div className={styles.techBadge}>
                <span className={styles.techIcon}>📡</span>
                <span>RouterOS</span>
              </div>
              <div className={styles.techBadge}>
                <span className={styles.techIcon}>🔐</span>
                <span>RADIUS</span>
              </div>
              <div className={styles.techBadge}>
                <span className={styles.techIcon}>🌐</span>
                <span>VPN</span>
              </div>
              <div className={styles.techBadge}>
                <span className={styles.techIcon}>📊</span>
                <span>Monitoring</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.featuresSection}>
          <div className="container">
            <Heading as="h2" className={styles.sectionTitle}>
              What You'll Find Here
            </Heading>
            <div className={styles.featureGrid}>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>🌐</span>
                <h3>Network Routing & Security</h3>
                <p>Policy-based routing, firewall rules, VPN setup, and advanced traffic management</p>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>🔒</span>
                <h3>ISP Infrastructure</h3>
                <p>PPPoE, RADIUS authentication, access concentrators, and multi-WAN failover</p>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>💻</span>
                <h3>Virtualization</h3>
                <p>Proxmox deployment, VM management, LXC containers, and cluster setup</p>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>📊</span>
                <h3>Monitoring & Alerts</h3>
                <p>NetWatch alerts, Telegram notifications, Docker containers, and performance monitoring</p>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>⚡</span>
                <h3>Bandwidth Management</h3>
                <p>QoS, bandwidth limiting, traffic shaping, and per-user prioritization</p>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>🎯</span>
                <h3>Automation</h3>
                <p>Scripting solutions, captive portals, auto-configuration, and system administration</p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.quickStart}>
          <div className="container">
            <Heading as="h2" className={styles.sectionTitle}>
              Quick Start
            </Heading>
            <div className={styles.quickStartGrid}>
              <Link to="/docs/intro" className={styles.quickStartCard}>
                <div className={styles.quickStartIcon}>📖</div>
                <h3>Read the Introduction</h3>
                <p>Get familiar with the knowledge base structure and navigation</p>
              </Link>
              <Link to="/docs/category/-security--firewall" className={styles.quickStartCard}>
                <div className={styles.quickStartIcon}>🔒</div>
                <h3>Security & Firewall</h3>
                <p>Secure your network with proven firewall configurations</p>
              </Link>
              <Link to="/docs/category/-routing--pbr" className={styles.quickStartCard}>
                <div className={styles.quickStartIcon}>🌐</div>
                <h3>Routing Guides</h3>
                <p>Master traffic routing and policy-based forwarding</p>
              </Link>
              <Link to="/blog" className={styles.quickStartCard}>
                <div className={styles.quickStartIcon}>📝</div>
                <h3>Latest Articles</h3>
                <p>Stay updated with new guides and network engineering tips</p>
              </Link>
            </div>
          </div>
        </section>

        {/* Connect Section */}
        <section className={styles.connectSection}>
          <div className="container">
            <Heading as="h2" className={styles.connectTitle}>
              Get in Touch
            </Heading>
            <p className={styles.connectDescription}>
              Have questions or feedback? Found a missing guide? I'd love to hear from you!
            </p>
            <div className={styles.contactLinks}>
              <a href="https://github.com/Kintoyyy" className={styles.contactLink} target="_blank" rel="noopener noreferrer">
                <span>🐙</span>
                <span>GitHub</span>
              </a>
              <a href="mailto:kent.oyyyyyyy@gmail.com" className={styles.contactLink}>
                <span>✉️</span>
                <span>Email</span>
              </a>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
