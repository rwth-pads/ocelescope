import { useRouter } from "next/router";

const usePagination = () => {
  const router = useRouter();

  const { query, pathname } = router;

  const currentPage = query.page ? parseInt(query.page.toString(), 10) : 1;

  const handlePageChange = (page: number) => {
    router.push({
      pathname,
      query: { ...query, page },
    });
  };

  return { currentPage, handlePageChange };
};

export default usePagination;
