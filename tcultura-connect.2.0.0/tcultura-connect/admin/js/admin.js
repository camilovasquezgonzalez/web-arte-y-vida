/**
 * TCultura Admin Scripts
 *
 * Initialises the WP Color Picker and handles the AJAX connection test.
 */
(function ($) {
    'use strict';

    $(function () {
        /* ── Colour Picker ──────────────────────────────────────────── */
        $('.tcultura-color-picker').wpColorPicker();

        /* ── Test Connection ────────────────────────────────────────── */
        var $btn    = $('#tcultura-test-btn');
        var $result = $('#tcultura-test-result');

        if (!$btn.length) return;

        $btn.on('click', function () {
            $result.text(tculturaAdminData.i18n.testing)
                   .removeClass('tcultura-success tcultura-error')
                   .css('opacity', 1);

            $btn.prop('disabled', true);

            $.post(tculturaAdminData.ajaxUrl, {
                action : 'tcultura_test',
                nonce  : tculturaAdminData.nonce
            })
            .done(function (resp) {
                var msg = (resp.data && resp.data.message) ? resp.data.message : '';
                $result.text(msg).addClass(resp.success ? 'tcultura-success' : 'tcultura-error');
            })
            .fail(function () {
                $result.text(tculturaAdminData.i18n.networkError).addClass('tcultura-error');
            })
            .always(function () {
                $btn.prop('disabled', false);
            });
        });
    });

})(jQuery);
