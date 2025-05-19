import { useRouter } from "next/router";

const router = useRouter();

return (key: string, value?: string) => {
  const newQuery = { ...router.query };

  if (value === undefined) {
    delete newQuery[key];
  } else {
    newQuery[key] = value;
  }

  router.replace(
    {
      pathname: router.pathname,
      query: newQuery,
    },
    undefined,
    { shallow: true }
  );
};
};
