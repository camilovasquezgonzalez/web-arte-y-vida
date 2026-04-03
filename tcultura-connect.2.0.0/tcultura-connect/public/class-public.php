<?php
/**
 * TCultura Public – Shortcode & Frontend Rendering.
 *
 * Renders [tcultura_eventos], enqueues CSS/JS, and injects the custom
 * button colour as a CSS variable.
 *
 * @package TCultura_Connect
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class TCultura_Public {

    /** @var TCultura_API_Client */
    private $api;

    /** @var array */
    private $settings;

    /* ── Bootstrap ──────────────────────────────────────────────────── */

    public function __construct( TCultura_API_Client $api ) {
        $this->api      = $api;
        $this->settings = tcultura_get_settings();

        add_shortcode( TCULTURA_SHORTCODE, array( $this, 'render' ) );
        add_action( 'wp_enqueue_scripts', array( $this, 'enqueue' ) );
    }

    /* ── Enqueue ────────────────────────────────────────────────────── */

    public function enqueue() {
        wp_enqueue_style(
            'tcultura-public',
            TCULTURA_PLUGIN_URL . 'public/css/tcultura-public.css',
            array(),
            TCULTURA_VERSION
        );

        wp_enqueue_script(
            'tcultura-public',
            TCULTURA_PLUGIN_URL . 'public/js/tcultura-public.js',
            array(),
            TCULTURA_VERSION,
            true
        );

        /* Inject custom accent colour */
        $color = isset( $this->settings['button_color'] ) ? $this->settings['button_color'] : TCULTURA_DEFAULT_BUTTON_COLOR;
        wp_add_inline_style( 'tcultura-public', ':root{--tcultura-accent:' . esc_attr( $color ) . ';}' );
    }

    /* ── Shortcode ──────────────────────────────────────────────────── */

    /**
     * [tcultura_eventos]
     */
    public function render( $atts ) {

        $items = $this->api->get_agenda();

        /* Error state */
        if ( isset( $items['error'] ) ) {
            return $this->msg( 'error', $items['error'] );
        }

        /* Empty state */
        if ( empty( $items ) ) {
            return $this->msg( 'info', __( 'No hay eventos programados en este momento.', 'tcultura-connect' ) );
        }

        ob_start();
        ?>
        <div class="tcultura-wrap" id="tcultura-root">

            <!-- ── Toolbar ────────────────────────────────────────── -->
            <div class="tcultura-toolbar">

                <div class="tcultura-search-box">
                    <svg class="tcultura-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input type="text"
                           id="tcultura-search"
                           class="tcultura-search-input"
                           placeholder="<?php echo esc_attr__( 'Buscar evento…', 'tcultura-connect' ); ?>"
                           autocomplete="off" />
                </div>

                <select id="tcultura-filter-cat" class="tcultura-select">
                    <option value=""><?php esc_html_e( 'Todas las categorías', 'tcultura-connect' ); ?></option>
                </select>

                <select id="tcultura-sort" class="tcultura-select">
                    <option value="date-asc"><?php esc_html_e( 'Próximos primero', 'tcultura-connect' ); ?></option>
                    <option value="date-desc"><?php esc_html_e( 'Lejanos primero', 'tcultura-connect' ); ?></option>
                    <option value="alpha"><?php esc_html_e( 'Nombre A–Z', 'tcultura-connect' ); ?></option>
                </select>
            </div>

            <!-- ── Counter ────────────────────────────────────────── -->
            <p class="tcultura-counter" id="tcultura-counter" aria-live="polite"></p>

            <!-- ── Grid ───────────────────────────────────────────── -->
            <div class="tcultura-grid" id="tcultura-grid">
                <?php foreach ( $items as $item ) :
                    $title    = $item['title']          ?? '';
                    $desc     = $item['description']    ?? '';
                    $date_iso = $item['date_iso']       ?? '';
                    $date_fmt = $item['date_formatted'] ?? '';
                    $category = $item['category']       ?? '';
                    $location = $item['location']       ?? '';
                    $image    = $item['image']           ?? '';
                    $link     = $item['link']            ?? '#';
                    $status   = $item['status']          ?? 'DISPONIBLE';
                    $type     = $item['type']            ?? '';
                ?>
                <article class="tcultura-card"
                         data-title="<?php echo esc_attr( mb_strtolower( $title ) ); ?>"
                         data-date="<?php echo esc_attr( $date_iso ); ?>"
                         data-category="<?php echo esc_attr( $category ); ?>">

                    <!-- Image -->
                    <div class="tcultura-card-img">
                        <?php if ( $image ) : ?>
                            <img src="<?php echo esc_url( $image ); ?>"
                                 alt="<?php echo esc_attr( $title ); ?>"
                                 loading="lazy" />
                        <?php else : ?>
                            <div class="tcultura-card-placeholder">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                     stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <polyline points="21 15 16 10 5 21"/>
                                </svg>
                            </div>
                        <?php endif; ?>

                        <?php if ( $category ) : ?>
                            <span class="tcultura-badge-cat"><?php echo esc_html( $category ); ?></span>
                        <?php endif; ?>

                        <?php if ( 'DISPONIBLE' !== strtoupper( $status ) ) : ?>
                            <span class="tcultura-badge-status tcultura-status-<?php echo esc_attr( sanitize_title( $status ) ); ?>">
                                <?php echo esc_html( $status ); ?>
                            </span>
                        <?php endif; ?>
                    </div>

                    <!-- Body -->
                    <div class="tcultura-card-body">
                        <h3 class="tcultura-card-title"><?php echo esc_html( $title ); ?></h3>

                        <?php if ( $desc ) : ?>
                            <p class="tcultura-card-desc"><?php echo esc_html( wp_trim_words( $desc, 20, '…' ) ); ?></p>
                        <?php endif; ?>

                        <div class="tcultura-card-meta">
                            <?php if ( $date_fmt ) : ?>
                            <span class="tcultura-meta-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                                    <line x1="16" y1="2" x2="16" y2="6"/>
                                    <line x1="8"  y1="2" x2="8"  y2="6"/>
                                    <line x1="3"  y1="10" x2="21" y2="10"/>
                                </svg>
                                <span class="tcultura-date-text"><?php echo esc_html( $date_fmt ); ?></span>
                            </span>
                            <?php endif; ?>

                            <?php if ( $location ) : ?>
                            <span class="tcultura-meta-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                    <circle cx="12" cy="10" r="3"/>
                                </svg>
                                <?php echo esc_html( $location ); ?>
                            </span>
                            <?php endif; ?>
                        </div>

                        <a href="<?php echo esc_url( $link ); ?>"
                           class="tcultura-btn"
                           target="_blank"
                           rel="noopener noreferrer">
                            <?php esc_html_e( 'Inscribirse', 'tcultura-connect' ); ?>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M5 12h14"/>
                                <path d="m12 5 7 7-7 7"/>
                            </svg>
                        </a>
                    </div>
                </article>
                <?php endforeach; ?>
            </div>

            <!-- ── Empty state ────────────────────────────────────── -->
            <div class="tcultura-empty" id="tcultura-empty" hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                    <path d="M8 11h6"/>
                </svg>
                <p><?php esc_html_e( 'No encontramos eventos con esos filtros.', 'tcultura-connect' ); ?></p>
                <button type="button" class="tcultura-btn-outline" id="tcultura-clear">
                    <?php esc_html_e( 'Ver todos los eventos', 'tcultura-connect' ); ?>
                </button>
            </div>

        </div>
        <?php
        return ob_get_clean();
    }

    /* ── Helper ─────────────────────────────────────────────────────── */

    /**
     * Renders a status message block.
     */
    private function msg( $type, $text ) {
        return '<div class="tcultura-msg tcultura-msg-' . esc_attr( $type ) . '"><p>' . esc_html( $text ) . '</p></div>';
    }
}
