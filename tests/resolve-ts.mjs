export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  }
  catch (error) {
    const isRelative = specifier.startsWith('./') || specifier.startsWith('../')
    if (isRelative && !/\.[cm]?[jt]s$/.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context)
    }
    throw error
  }
}
