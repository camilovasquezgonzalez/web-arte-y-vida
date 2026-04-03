<?php
/**
 * TCultura Admin Settings Page.
 *
 * Registers the menu page, settings fields, connection tester, and inline CSS
 * for the admin UI.
 *
 * @package TCultura_Connect
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class TCultura_Admin {

    /** @var TCultura_API_Client */
    private $api;

    /* ── Bootstrap ──────────────────────────────────────────────────── */

    public function __construct( TCultura_API_Client $api ) {
        $this->api = $api;

        add_action( 'admin_menu',            array( $this, 'register_menu' ) );
        add_action( 'admin_init',            array( $this, 'register_settings' ) );
        add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );

        /* AJAX connection test */
        add_action( 'wp_ajax_tcultura_test', array( $this, 'ajax_test_connection' ) );

        /* Settings link on Plugins list */
        add_filter( 'plugin_action_links_' . TCULTURA_PLUGIN_BASENAME, array( $this, 'settings_link' ) );
    }

    /* ── Assets ─────────────────────────────────────────────────────── */

    public function enqueue_assets( $hook ) {
        if ( 'toplevel_page_tcultura-settings' !== $hook ) {
            return;
        }

        wp_enqueue_style( 'wp-color-picker' );
        wp_enqueue_script( 'wp-color-picker' );

        wp_enqueue_style(
            'tcultura-admin',
            TCULTURA_PLUGIN_URL . 'admin/css/admin.css',
            array(),
            TCULTURA_VERSION
        );

        wp_enqueue_script(
            'tcultura-admin-js',
            TCULTURA_PLUGIN_URL . 'admin/js/admin.js',
            array( 'jquery', 'wp-color-picker' ),
            TCULTURA_VERSION,
            true
        );

        wp_localize_script( 'tcultura-admin-js', 'tculturaAdminData', array(
            'ajaxUrl' => admin_url( 'admin-ajax.php' ),
            'nonce'   => wp_create_nonce( 'tcultura_test_nonce' ),
            'i18n'    => array(
                'testing'      => __( 'Probando conexión…', 'tcultura-connect' ),
                'networkError' => __( 'Error de red. Intenta de nuevo.', 'tcultura-connect' ),
            ),
        ) );
    }

    /* ── Menu ───────────────────────────────────────────────────────── */

    public function register_menu() {
        add_menu_page(
            __( 'TCultura Connect', 'tcultura-connect' ),
            TCULTURA_BRAND_NAME,
            'manage_options',
            'tcultura-settings',
            array( $this, 'render_page' ),
            'dashicons-tickets-alt',
            26
        );
    }

    /* ── Settings link on plugins page ──────────────────────────────── */

    public function settings_link( $links ) {
        $url  = admin_url( 'admin.php?page=tcultura-settings' );
        $link = '<a href="' . esc_url( $url ) . '">' . __( 'Configuración', 'tcultura-connect' ) . '</a>';
        array_unshift( $links, $link );
        return $links;
    }

    /* ── Register Settings ──────────────────────────────────────────── */

    public function register_settings() {

        register_setting( 'tcultura_group', TCULTURA_OPTION_KEY, array(
            'type'              => 'array',
            'sanitize_callback' => array( $this, 'sanitize' ),
        ) );

        /* ── Section: API Key ── */
        add_settings_section(
            'tcultura_sec_api',
            '',
            '__return_false',
            'tcultura-settings'
        );

        add_settings_field( 'api_key', __( 'API Key del Proyecto', 'tcultura-connect' ),
            array( $this, 'field_api_key' ), 'tcultura-settings', 'tcultura_sec_api' );

        /* ── Section: Content ── */
        add_settings_section(
            'tcultura_sec_content',
            '',
            '__return_false',
            'tcultura-settings'
        );

        add_settings_field( 'show_events', __( 'Mostrar Eventos', 'tcultura-connect' ),
            array( $this, 'field_show_events' ), 'tcultura-settings', 'tcultura_sec_content' );

        add_settings_field( 'show_activities', __( 'Mostrar Actividades', 'tcultura-connect' ),
            array( $this, 'field_show_activities' ), 'tcultura-settings', 'tcultura_sec_content' );

        add_settings_field( 'date_range', __( 'Rango de Fechas', 'tcultura-connect' ),
            array( $this, 'field_date_range' ), 'tcultura-settings', 'tcultura_sec_content' );

        /* ── Section: Appearance ── */
        add_settings_section(
            'tcultura_sec_appearance',
            '',
            '__return_false',
            'tcultura-settings'
        );

        add_settings_field( 'button_color', __( 'Color del Botón', 'tcultura-connect' ),
            array( $this, 'field_button_color' ), 'tcultura-settings', 'tcultura_sec_appearance' );
    }

    /* ── Sanitize ───────────────────────────────────────────────────── */

    public function sanitize( $input ) {
        $clean = array();

        $clean['api_key']      = isset( $input['api_key'] ) ? sanitize_text_field( $input['api_key'] ) : '';
        $clean['button_color'] = isset( $input['button_color'] ) ? sanitize_hex_color( $input['button_color'] ) : TCULTURA_DEFAULT_BUTTON_COLOR;

        $valid_ranges         = array_keys( tcultura_get_date_ranges() );
        $clean['date_range']  = ( isset( $input['date_range'] ) && in_array( $input['date_range'], $valid_ranges, true ) )
            ? $input['date_range']
            : 'all';

        $clean['show_events']     = ! empty( $input['show_events'] ) ? 1 : 0;
        $clean['show_activities'] = ! empty( $input['show_activities'] ) ? 1 : 0;

        /* Bust cache so new settings take effect immediately */
        delete_transient( TCULTURA_CACHE_KEY );

        add_settings_error( 'tcultura_msg', 'tcultura_ok',
            __( 'Configuración guardada.', 'tcultura-connect' ), 'success' );

        return $clean;
    }

    /* ── Field Renderers ────────────────────────────────────────────── */

    public function field_api_key() {
        $val         = $this->opt( 'api_key' );
        $source_type = tcultura_get_bootstrap_api_key_source_type();
        $source_name = tcultura_get_bootstrap_api_key_source_label();
        ?>
        <div class="tcultura-admin-field-wide">
            <input type="text"
                   id="tcultura_api_key"
                   name="<?php echo esc_attr( TCULTURA_OPTION_KEY ); ?>[api_key]"
                   value="<?php echo esc_attr( $val ); ?>"
                   class="regular-text"
                   placeholder="b2b_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                   autocomplete="off" />

            <button type="button" id="tcultura-test-btn" class="button button-secondary">
                <?php esc_html_e( 'Probar Conexión', 'tcultura-connect' ); ?>
            </button>
            <span id="tcultura-test-result"></span>

            <?php if ( 'env' === $source_type ) : ?>
                <p class="description" style="margin-top:12px;">
                    <?php
                    printf(
                        /* translators: %s is the environment variable name */
                        esc_html__( 'Se detecto una API Key externa desde la variable de entorno %s.', 'tcultura-connect' ),
                        '<code>' . esc_html( $source_name ) . '</code>'
                    );
                    ?>
                </p>
            <?php elseif ( 'file' === $source_type ) : ?>
                <p class="description" style="margin-top:12px;">
                    <?php
                    printf(
                        /* translators: %s is the local file name that stores the API key */
                        esc_html__( 'Se detecto una API Key externa desde el archivo local %s.', 'tcultura-connect' ),
                        '<code>' . esc_html( basename( $source_name ) ) . '</code>'
                    );
                    ?>
                </p>
            <?php endif; ?>

            <p class="description" style="margin-top:12px;">
                <?php
                printf(
                    /* translators: 1: opening <a> tag, 2: closing </a> tag */
                    esc_html__( 'Obtén tu API Key en %1$sDataCultura.org%2$s cuando tu organización empiece a medir el impacto de sus eventos.', 'tcultura-connect' ),
                    '<a href="' . esc_url( TCULTURA_REGISTER_URL ) . '" target="_blank" rel="noopener">',
                    '</a>'
                );
                ?>
            </p>
        </div>
        <?php
    }

    public function field_show_events() {
        $val = $this->opt( 'show_events', 1 );
        ?>
        <label class="tcultura-toggle">
            <input type="checkbox"
                   name="<?php echo esc_attr( TCULTURA_OPTION_KEY ); ?>[show_events]"
                   value="1"
                   <?php checked( $val, 1 ); ?> />
            <span class="tcultura-toggle-slider"></span>
            <span class="tcultura-toggle-label"><?php esc_html_e( 'Incluir eventos en el listado público', 'tcultura-connect' ); ?></span>
        </label>
        <?php
    }

    public function field_show_activities() {
        $val = $this->opt( 'show_activities', 1 );
        ?>
        <label class="tcultura-toggle">
            <input type="checkbox"
                   name="<?php echo esc_attr( TCULTURA_OPTION_KEY ); ?>[show_activities]"
                   value="1"
                   <?php checked( $val, 1 ); ?> />
            <span class="tcultura-toggle-slider"></span>
            <span class="tcultura-toggle-label"><?php esc_html_e( 'Incluir actividades en el listado público', 'tcultura-connect' ); ?></span>
        </label>
        <?php
    }

    public function field_date_range() {
        $val    = $this->opt( 'date_range', 'all' );
        $ranges = tcultura_get_date_ranges();
        ?>
        <select name="<?php echo esc_attr( TCULTURA_OPTION_KEY ); ?>[date_range]">
            <?php foreach ( $ranges as $key => $info ) : ?>
                <option value="<?php echo esc_attr( $key ); ?>" <?php selected( $val, $key ); ?>>
                    <?php echo esc_html( $info['label'] ); ?>
                </option>
            <?php endforeach; ?>
        </select>
        <p class="description">
            <?php esc_html_e( 'Filtra los eventos que se muestran en el frontend según su proximidad.', 'tcultura-connect' ); ?>
        </p>
        <?php
    }

    public function field_button_color() {
        $val = $this->opt( 'button_color', TCULTURA_DEFAULT_BUTTON_COLOR );
        ?>
        <input type="text"
               name="<?php echo esc_attr( TCULTURA_OPTION_KEY ); ?>[button_color]"
               value="<?php echo esc_attr( $val ); ?>"
               class="tcultura-color-picker"
               data-default-color="<?php echo esc_attr( TCULTURA_DEFAULT_BUTTON_COLOR ); ?>" />
        <p class="description">
            <?php esc_html_e( 'Se aplica al botón "Inscribirse" y acentos visuales de las tarjetas.', 'tcultura-connect' ); ?>
        </p>
        <?php
    }

    /* ── Page Renderer ──────────────────────────────────────────────── */

    public function render_page() {
        ?>
        <div class="wrap tcultura-admin-wrap">
 
            <!-- Header -->
            <div class="tcultura-admin-header">
                <div class="tcultura-admin-header-inner">
                    <img src="<?php echo esc_url( TCULTURA_BRAND_LOGO ); ?>" alt="<?php echo esc_attr( TCULTURA_BRAND_NAME ); ?>" class="tcultura-admin-logo" />
                    <div>
                        <h1><?php echo esc_html( TCULTURA_BRAND_NAME ); ?> Connect</h1>
                        <p><?php esc_html_e( 'Conecta tu sitio WordPress con la plataforma TCultura y muestra tus eventos culturales.', 'tcultura-connect' ); ?></p>
                    </div>
                </div>
            </div>

            <?php settings_errors( 'tcultura_msg' ); ?>

            <form method="post" action="options.php" class="tcultura-admin-form">
                <?php settings_fields( 'tcultura_group' ); ?>

                <!-- Card: API -->
                <div class="tcultura-admin-card">
                    <h2 class="tcultura-admin-card-title">
                        <span class="dashicons dashicons-admin-network"></span>
                        <?php esc_html_e( 'Conexión con la API', 'tcultura-connect' ); ?>
                    </h2>
                    <table class="form-table" role="presentation">
                        <?php do_settings_fields( 'tcultura-settings', 'tcultura_sec_api' ); ?>
                    </table>
                </div>

                <!-- Card: Content -->
                <div class="tcultura-admin-card">
                    <h2 class="tcultura-admin-card-title">
                        <span class="dashicons dashicons-filter"></span>
                        <?php esc_html_e( 'Contenido a Mostrar', 'tcultura-connect' ); ?>
                    </h2>
                    <table class="form-table" role="presentation">
                        <?php do_settings_fields( 'tcultura-settings', 'tcultura_sec_content' ); ?>
                    </table>
                </div>

                <!-- Card: Appearance -->
                <div class="tcultura-admin-card">
                    <h2 class="tcultura-admin-card-title">
                        <span class="dashicons dashicons-art"></span>
                        <?php esc_html_e( 'Apariencia', 'tcultura-connect' ); ?>
                    </h2>
                    <table class="form-table" role="presentation">
                        <?php do_settings_fields( 'tcultura-settings', 'tcultura_sec_appearance' ); ?>
                    </table>
                </div>

                <?php submit_button( __( 'Guardar Configuración', 'tcultura-connect' ), 'primary large' ); ?>
            </form>

            <!-- Shortcode help -->
            <div class="tcultura-admin-card tcultura-admin-card-info">
                <h2 class="tcultura-admin-card-title">
                    <span class="dashicons dashicons-shortcode"></span>
                    <?php esc_html_e( 'Cómo usar el plugin', 'tcultura-connect' ); ?>
                </h2>
                <p><?php esc_html_e( 'Copia y pega este shortcode en cualquier página, entrada o widget de texto:', 'tcultura-connect' ); ?></p>
                <div class="tcultura-shortcode-box">
                    <code id="tcultura-shortcode-code">[<?php echo esc_html( TCULTURA_SHORTCODE ); ?>]</code>
                    <button type="button" class="button button-small" onclick="navigator.clipboard.writeText('[<?php echo esc_js( TCULTURA_SHORTCODE ); ?>]')">
                        <?php esc_html_e( 'Copiar', 'tcultura-connect' ); ?>
                    </button>
                </div>
                <p class="description" style="margin-top:12px;">
                    <?php esc_html_e( 'Los eventos aparecerán automáticamente con búsqueda, filtros por categoría y ordenamiento.', 'tcultura-connect' ); ?>
                </p>
            </div>

        <!-- Footer -->
        <div class="tcultura-admin-footer">
            <p>
                &copy; <?php echo esc_html( gmdate( 'Y' ) ); ?>
                <a href="<?php echo esc_url( TCULTURA_BRAND_URL ); ?>" target="_blank" rel="noopener"><?php echo esc_html( TCULTURA_BRAND_NAME ); ?></a>
                <?php esc_html_e( 'by', 'tcultura-connect' ); ?>
                <a href="<?php echo esc_url( TCULTURA_COMPANY_URL ); ?>" target="_blank" rel="noopener"><?php echo esc_html( TCULTURA_COMPANY_NAME ); ?></a>
                &middot;
                <a href="<?php echo esc_url( 'mailto:' . TCULTURA_SUPPORT_EMAIL ); ?>"><?php echo esc_html( TCULTURA_SUPPORT_EMAIL ); ?></a>
            </p>
            <p class="tcultura-admin-footer-tagline"><?php esc_html_e( 'Plataforma tecnológica para la gestión y medición de impacto cultural', 'tcultura-connect' ); ?></p>
            <a href="<?php echo esc_url( TCULTURA_COMPANY_URL ); ?>" target="_blank" rel="noopener">
                <img src="<?php echo esc_url( TCULTURA_COMPANY_LOGO ); ?>"
                    alt="<?php echo esc_attr( TCULTURA_COMPANY_NAME ); ?>"
                    class="tcultura-admin-footer-logo" />
            </a>
        </div>


    </div>
        <?php
    }

    /* ── AJAX: Test Connection ──────────────────────────────────────── */

    public function ajax_test_connection() {
        check_ajax_referer( 'tcultura_test_nonce', 'nonce' );

        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( __( 'Sin permisos.', 'tcultura-connect' ) );
        }

        $result = $this->api->test_connection();
        $result['success'] ? wp_send_json_success( $result ) : wp_send_json_error( $result );
    }

    /* ── Helper ─────────────────────────────────────────────────────── */

    /**
     * Reads a single setting with a fallback.
     */
    private function opt( $key, $default = '' ) {
        $settings = tcultura_get_settings();
        return isset( $settings[ $key ] ) ? $settings[ $key ] : $default;
    }
}
