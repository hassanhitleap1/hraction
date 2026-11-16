<script setup lang="ts">
// Employees — directors see their team, HR / IT / CEO see everyone.
import type { Ref } from 'vue'
import type { EmployeeItem, LookupsResponse } from '~/composables/types'

definePageMeta({ roles: ['DIRECTOR', 'HR', 'IT', 'CEO'] })

const { t, locale } = useI18n()
const perms = usePermissions()
useHead({ title: () => t('nav.employees') })

const filters = reactive({ search: '', departmentId: '', branchId: '', active: 'true' })
const search = refDebounced(toRef(filters, 'search'), 300)
const query = computed(() => ({
  ...(search.value ? { search: search.value } : {}),
  ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
  ...(filters.branchId ? { branchId: filters.branchId } : {}),
  active: filters.active,
}))

const { data: lookups } = await useFetch<LookupsResponse>('/api/lookups')
const { data: employees, pending } = await useFetch<EmployeeItem[]>('/api/employees', { query })

const branches = computed(() => lookups.value?.departments.find(d => String(d.id) === filters.departmentId)?.branches ?? [])
watch(() => filters.departmentId, () => (filters.branchId = ''))

// Tiny debounce helper (no extra package)
function refDebounced<T>(source: Ref<T>, ms: number) {
  const out = ref(source.value) as Ref<T>
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(source, (v) => {
    clearTimeout(timer)
    timer = setTimeout(() => (out.value = v), ms)
  })
  return out
}
</script>

<template>
  <div>
    <PageHeader :title="t('nav.employees')" :subtitle="employees ? t('employees.count', { n: employees.length }) : undefined" back="/">
      <template v-if="perms.canManage.value" #actions>
        <NuxtLink to="/employees/new" class="btn-primary"><AppIcon name="plus" :size="18" />{{ t('employees.add') }}</NuxtLink>
      </template>
    </PageHeader>

    <div class="card mb-4 grid gap-3 p-4 sm:grid-cols-4">
      <div class="relative sm:col-span-2">
        <label class="sr-only" for="search">{{ t('common.search') }}</label>
        <AppIcon name="search" :size="18" class="pointer-events-none absolute start-3 top-3.5 text-slate-400" />
        <input id="search" v-model="filters.search" type="search" class="input ps-10" :placeholder="t('employees.searchPlaceholder')">
      </div>
      <select v-if="perms.canViewAll.value" v-model="filters.departmentId" class="input" :aria-label="t('employees.department')">
        <option value="">{{ t('employees.allDepartments') }}</option>
        <option v-for="d in lookups?.departments" :key="d.id" :value="String(d.id)">{{ localName(d, locale) }}</option>
      </select>
      <select v-if="branches.length" v-model="filters.branchId" class="input" :aria-label="t('employees.branch')">
        <option value="">{{ t('employees.allBranches') }}</option>
        <option v-for="b in branches" :key="b.id" :value="String(b.id)">{{ localName(b, locale) }}</option>
      </select>
      <select v-else v-model="filters.active" class="input" :aria-label="t('employees.status')">
        <option value="true">{{ t('employees.active') }}</option>
        <option value="false">{{ t('employees.inactive') }}</option>
        <option value="all">{{ t('common.all') }}</option>
      </select>
    </div>

    <div v-if="pending && !employees" class="py-10 text-center text-slate-400">{{ t('common.loading') }}</div>
    <EmptyState v-else-if="!employees?.length" icon="users" :text="t('employees.empty')" />
    <div v-else class="card divide-y divide-slate-100">
      <NuxtLink
        v-for="e in employees"
        :key="e.id"
        :to="`/employees/${e.id}`"
        class="flex items-center gap-3 p-4 hover:bg-slate-50"
      >
        <UserAvatar :name="e.name" :src="e.photoUrl" :size="42" />
        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold text-slate-900">
            {{ e.name }}
            <span v-if="!e.isActive" class="chip ms-1 bg-slate-100 text-slate-500">{{ t('employees.inactive') }}</span>
          </p>
          <p class="truncate text-sm text-slate-500">
            {{ e.position || t(`roles.${e.role}`) }} · {{ localName(e.department, locale) }}<template v-if="e.branch"> · {{ localName(e.branch, locale) }}</template>
          </p>
        </div>
        <span class="ltr-nums hidden text-sm text-slate-500 sm:block">{{ e.phone }}</span>
        <AppIcon name="forward" :size="18" class="text-slate-300 rtl:rotate-180" />
      </NuxtLink>
    </div>
  </div>
</template>
