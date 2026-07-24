import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NoFoco, Radius, Spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Pinta a ação de vermelho — use quando algo é apagado. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Confirmação de ação sem volta.
 *
 * Não usa `Alert.alert` (no-op na web) nem `Modal` do React Native: o Modal monta
 * fora do `#root` no react-native-web, e como o React só escuta eventos dentro do
 * root, os botões ficam inertes no navegador. Um overlay absoluto na própria árvore
 * se comporta igual nas duas plataformas.
 *
 * Por ser absoluto, cobre o pai — use em telas de pilha (tela cheia), não dentro de
 * um container parcial.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive,
  onConfirm,
  onCancel,
}: Props) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        {/* o card intercepta o toque para não fechar ao clicar dentro dele */}
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}

          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.cancel]} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, destructive ? styles.confirmDanger : styles.confirm]}
              onPress={onConfirm}>
              <Text style={[styles.confirmText, destructive && styles.confirmTextDanger]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
    elevation: 100,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  title: { color: NoFoco.ink, fontSize: 16, fontWeight: '800' },
  message: { color: NoFoco.soft, fontSize: 13, lineHeight: 19, marginTop: Spacing.sm },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  btn: { flex: 1, borderRadius: Radius.md, paddingVertical: 13, alignItems: 'center' },
  cancel: { backgroundColor: NoFoco.surface2 },
  cancelText: { color: NoFoco.ink, fontSize: 13.5, fontWeight: '700' },
  confirm: { backgroundColor: NoFoco.accent },
  confirmDanger: { backgroundColor: NoFoco.danger },
  confirmText: { color: NoFoco.onAccent, fontSize: 13.5, fontWeight: '800' },
  confirmTextDanger: { color: NoFoco.ink },
});
