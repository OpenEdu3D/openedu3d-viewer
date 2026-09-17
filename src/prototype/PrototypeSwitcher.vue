<script setup lang="ts">
defineProps<{ variant: string }>();
defineEmits<{ change: [direction: number] }>();
const names: Record<string, string> = { A: '侧栏编辑', B: '课堂展示', C: '逐条讲解' };
const isDev = import.meta.env.DEV;
</script>

<template>
  <nav v-if="isDev" class="prototype-switcher" aria-label="原型布局切换">
    <button aria-label="上一个布局" @click="$emit('change', -1)">←</button>
    <span>原型 {{ variant }} · {{ names[variant] }}</span>
    <button aria-label="下一个布局" @click="$emit('change', 1)">→</button>
  </nav>
</template>
